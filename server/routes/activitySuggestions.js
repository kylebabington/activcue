import { Router } from "express";
import {
  OPENAI_MODEL,
  createStructuredResponseWithMeta,
} from "../lib/openaiClient.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { requirePaidSubscription } from "../middleware/requirePaidSubscription.js";
import {
  buildActivitySuggestionsInput,
  buildActivitySuggestionsInstructions,
} from "../prompts/activitySuggestions.js";
import { activitySuggestionsSchemaV3 } from "../schemas/activitySuggestionsSchemaV3.js";
import { activitySuggestionsSchemaV4 } from "../schemas/activitySuggestionsSchemaV4.js";
import {
  validateImaginativeStoryQuality,
  formatStoryQualitySteerHints,
} from "../utils/activityStoryQualityValidation.js";
import { formatNarrativeSteerHints } from "../utils/activityNarrativeValidation.js";
import { validateActivityQuality } from "../utils/validateActivityQuality.js";
import { isActivityFormatV4 } from "../utils/activityFormat.js";
import {
  buildSafeCurrentMoment,
  buildSafeSafetySettings,
  resolveActivityStyle,
} from "../utils/normalizeRequest.js";
import { enrichActivityForServe } from "../utils/enrichActivityForServe.js";
import { getGroupAgeContext } from "../utils/childAge.js";
import {
  logAgeFitBatchSummary,
} from "../utils/activityAgePolicy.js";
import {
  filterActivitiesByFitPolicy,
  buildFitRequestContextFromParts,
} from "../utils/activityFitPolicy.js";
import { resolveParticipantContext } from "../utils/participantContext.js";
import { buildSanitizedGenerationContext } from "../utils/sanitizedGenerationContext.js";
import { recordAiUsageEvent } from "../lib/aiUsage.js";
import { expandGenerationIntent } from "../lib/generationIntent.js";
import { attachRecommendationIds } from "../lib/recommendationIds.js";
import {
  ingestGeneratedActivities,
  querySharedCandidatesForUser,
  recordCandidatesShown,
} from "../lib/sharedActivityLibrary.js";
import {
  createActivityMoment,
  createRecommendationBatch,
} from "../lib/recommendationTelemetry.js";
import { aiSuggestionsRateLimiter } from "../middleware/rateLimits.js";
import {
  AiResponseInvalidError,
  generateActivitiesWithParseRecovery,
} from "../utils/generateActivitiesWithParseRecovery.js";
import {
  SUGGESTION_COUNT,
  MAX_AI_GENERATE_COUNT,
  computeAiGenerateCount,
  computeV4ImaginativeGenerateCount,
  takeAiFill,
} from "../utils/suggestionFill.js";
import {
  shouldRunNarrativeRetry,
  shouldRunAgeFitRetry,
  shouldRunPartialRefill,
  shouldFailAgeFit,
} from "../utils/activitySuggestionsRetryPolicy.js";

function resolveAiGenerateCount(activityStyle, slotsNeeded) {
  if (activityStyle === "imaginative") {
    return computeV4ImaginativeGenerateCount(slotsNeeded);
  }
  return computeAiGenerateCount(slotsNeeded);
}

const router = Router();
const isDebugLogging = process.env.DEBUG_AI_RESPONSES === "true";
/** Over-fetch before age-fit so we still fill the pool after rejects. */
const CACHE_LOOKUP_LIMIT = 12;

function mergeUsageMeta(base, next) {
  if (!next) return base;
  if (!base) {
    return {
      model: next.model || OPENAI_MODEL,
      inputTokens: next.inputTokens || 0,
      outputTokens: next.outputTokens || 0,
      totalTokens: next.totalTokens || 0,
      responseId: next.responseId || null,
      instructionChars: next.instructionChars ?? null,
      inputChars: next.inputChars ?? null,
    };
  }
  return {
    model: next.model || base.model,
    inputTokens: (base.inputTokens || 0) + (next.inputTokens || 0),
    outputTokens: (base.outputTokens || 0) + (next.outputTokens || 0),
    totalTokens: (base.totalTokens || 0) + (next.totalTokens || 0),
    responseId: next.responseId || base.responseId,
    instructionChars: base.instructionChars,
    inputChars: base.inputChars,
  };
}

function summarizeRejectedDetails(rejectedDetails = []) {
  const developmentalWarnings = {};
  const participantSamples = [];
  for (const detail of rejectedDetails.slice(0, 5)) {
    const result = detail?.result || {};
    for (const warning of result.ageWarnings || []) {
      developmentalWarnings[warning] = (developmentalWarnings[warning] || 0) + 1;
    }
    if (result.participantDiagnostics && participantSamples.length < 3) {
      participantSamples.push(result.participantDiagnostics);
    }
  }
  return { developmentalWarnings, participantSamples };
}

function classifyFitFailureType(rejectedByReason = {}) {
  if ((rejectedByReason["participant-count-mismatch"] || 0) > 0) {
    return "PARTICIPANT_FIT_FAILED";
  }
  if ((rejectedByReason["developmental-complexity"] || 0) > 0) {
    return "DEVELOPMENTAL_COMPLEXITY_FAILED";
  }
  if ((rejectedByReason["noise-limit"] || 0) > 0) {
    return "NOISE_FIT_FAILED";
  }
  if ((rejectedByReason["space-mismatch"] || 0) > 0) {
    return "SPACE_FIT_FAILED";
  }
  if ((rejectedByReason["age-range-mismatch"] || 0) > 0) {
    return "AGE_RANGE_FAILED";
  }
  return "AGE_FIT_FAILED";
}

function buildStoryQualityContext(groupAgeContext, childrenContext) {
  const ages = Array.isArray(childrenContext)
    ? childrenContext
        .map((child) => Number(child?.ageYears))
        .filter((age) => Number.isFinite(age))
    : [];
  return {
    youngestAge:
      ages.length > 0
        ? Math.min(...ages)
        : Number(groupAgeContext?.youngestAge) || null,
    oldestAge:
      ages.length > 0
        ? Math.max(...ages)
        : Number(groupAgeContext?.oldestAge) || null,
    participantCount: ages.length || 1,
  };
}

function recordStoryRejection(aiDiagnostics, result, activity) {
  aiDiagnostics.aiStoryRejectedCount += 1;
  for (const reason of result.reasons || []) {
    aiDiagnostics.aiStoryRejectedByReason[reason] =
      (aiDiagnostics.aiStoryRejectedByReason[reason] || 0) + 1;
  }
  console.warn("[story-quality] rejected", {
    title: activity?.title,
    errors: result.errors,
    reasons: result.reasons,
  });
}

function resolveGenerationSchema(activityStyle) {
  if (activityStyle === "imaginative") {
    return activitySuggestionsSchemaV4;
  }
  return activitySuggestionsSchemaV3;
}

function formatQualitySteerHints(reasons = [], activityStyle) {
  if (activityStyle === "imaginative") {
    return formatNarrativeSteerHints(reasons);
  }
  return formatStoryQualitySteerHints(reasons);
}

function recordNarrativeRejection(aiDiagnostics, result, activity) {
  aiDiagnostics.aiStoryRejectedCount += 1;
  aiDiagnostics.aiNarrativeRejectedCount =
    (aiDiagnostics.aiNarrativeRejectedCount || 0) + 1;
  for (const reason of result.reasons || []) {
    aiDiagnostics.aiStoryRejectedByReason[reason] =
      (aiDiagnostics.aiStoryRejectedByReason[reason] || 0) + 1;
    aiDiagnostics.aiNarrativeRejectedByReason =
      aiDiagnostics.aiNarrativeRejectedByReason || {};
    aiDiagnostics.aiNarrativeRejectedByReason[reason] =
      (aiDiagnostics.aiNarrativeRejectedByReason[reason] || 0) + 1;
  }
  console.warn("[narrative-quality] rejected", {
    title: activity?.title,
    errors: result.errors,
    reasons: result.reasons,
  });
}

function passesAiGenerationQuality(
  activity,
  { activityStyle, storyContext, aiDiagnostics }
) {
  const quality = validateActivityQuality(activity, storyContext, {
    mode: "generation",
    childrenContext: storyContext?.childrenContext,
    activityMode: storyContext?.activityMode,
  });

  if (!quality.checks?.clarity?.valid) {
    aiDiagnostics.aiClarityRejectedCount += 1;
    console.warn("[clarity] rejected", {
      title: activity?.title,
      errors: quality.checks?.clarity?.errors,
    });
    return false;
  }

  if (activityStyle === "imaginative") {
    const narrativeResult = quality.checks?.narrative;
    if (narrativeResult && !narrativeResult.skipped && !narrativeResult.valid) {
      recordNarrativeRejection(aiDiagnostics, narrativeResult, activity);
      return false;
    }
    if (!isActivityFormatV4(activity)) {
      const storyResult = validateImaginativeStoryQuality(activity, storyContext);
      if (!storyResult.valid) {
        recordStoryRejection(aiDiagnostics, storyResult, activity);
        return false;
      }
    }
  }

  return true;
}

function buildPartialRefillSteer({
  remaining,
  rejectionTitles,
  rejectedByReason,
  participantCount,
  rejectedDetails = [],
  allowedSocialModes = [],
  storyRejectedByReason = {},
}) {
  const { developmentalWarnings, participantSamples } =
    summarizeRejectedDetails(rejectedDetails);

  const reasonParts =
    rejectedByReason && typeof rejectedByReason === "object"
      ? Object.entries(rejectedByReason)
          .map(([reason, count]) => `${reason}:${count}`)
          .join(", ")
      : "";

  const devParts = Object.entries(developmentalWarnings)
    .map(([w, count]) => `${w}:${count}`)
    .join(", ");

  const lines = [
    `PARTIAL REFILL: Need ${remaining} more activity(ies) that pass clarity and fit filters.`,
    "Do not repeat any titles listed to avoid.",
    `Required participant count: ${participantCount}.`,
  ];

  if (allowedSocialModes.length > 0) {
    lines.push(
      `Allowed traits.socialMode values for this request: ${allowedSocialModes.join(", ")}.`
    );
  }

  if (participantCount >= 2) {
    lines.push(
      "Every listed child must have a meaningful childRoles entry. Use cooperative or flexible socialMode unless the activity is genuinely solo.",
      "participantMin must be ≤ participant count and participantMax must be ≥ participant count."
    );
  } else {
    lines.push(
      "Single-player: childRoles must be empty. Use solo or flexible socialMode. No partner language."
    );
  }

  lines.push(
    "Match age, mess, noise, supervision, space, and inventory constraints exactly."
  );

  if (devParts) {
    lines.push(`Developmental failures to fix: ${devParts}.`);
    lines.push(
      "If too-many-actions-per-scene: reduce actions per scene to the budget maximum.",
      "If too-many-scenes: reduce stepDetails count.",
      "If abstract-planning: use concrete literal actions with examples."
    );
  }

  if (reasonParts) {
    lines.push(`Previous batch failed fit for: ${reasonParts}.`);
  }

  const storyReasonParts =
    storyRejectedByReason && typeof storyRejectedByReason === "object"
      ? Object.entries(storyRejectedByReason)
          .map(([reason, count]) => `${reason}:${count}`)
          .join(", ")
      : "";

  if (storyReasonParts) {
    lines.push(`Previous batch failed story quality for: ${storyReasonParts}.`);
    const storyHints = formatStoryQualitySteerHints(
      Object.keys(storyRejectedByReason)
    );
    lines.push(...storyHints);
  }

  if (participantSamples.length > 0) {
    lines.push(
      `Sample normalized participant metadata from rejects: ${JSON.stringify(participantSamples)}`
    );
  }

  if (rejectionTitles?.length > 0) {
    lines.push(
      `Rejected titles to avoid: ${rejectionTitles
        .map((title) => `"${title}"`)
        .join(", ")}.`
    );
  }
  return lines.join("\n");
}

export { buildPartialRefillSteer };

function logSuggestionTiming(payload) {
  try {
    console.info(
      "[activity-suggestions:timing]",
      JSON.stringify(payload)
    );
  } catch {
    // ignore
  }
}

function buildAgeFitRetrySteer({ oldestAge, childAges, rejectionTitles }) {
  const agesLabel =
    Array.isArray(childAges) && childAges.length > 0
      ? childAges.join(", ")
      : String(oldestAge ?? "unknown");
  const lines = [
    "AGE RETRY: The previous activity batch was rejected for age fit, maturity, or developmental complexity.",
    `TARGET CHILD AGE(S): EXACTLY ${agesLabel}.`,
    "ageFit.minAge/maxAge must cover every participating child. targetAges should include the exact ages.",
  ];

  if (Number.isFinite(oldestAge) && oldestAge >= 13) {
    lines.push(
      "This is a young teenager. The activity must feel socially appropriate for a teenager.",
      "Do not reuse preschool pretend-play framing. Prefer autonomy, design, strategy, invention, building, investigation, photography, music, games, or creative production.",
      "Avoid blanket forts, stuffed-animal play, fairy/princess framing, and magical castles."
    );
  } else if (Number.isFinite(oldestAge) && oldestAge >= 10) {
    lines.push(
      "This is an older-elementary / tween child. Prefer challenge-first framing with strategy and independent creation.",
      "Avoid preschool fort/nursery framing."
    );
  } else if (Number.isFinite(oldestAge) && oldestAge <= 7) {
    lines.push(
      "This is an early-elementary child. Instructions must be concrete and literal.",
      "Use short actions and limited choices. Maximum 4 scenes with 2–4 actions each.",
      "The child must never infer missing setup. Provide examples they can copy immediately.",
      "Avoid abstract planning, optimal sequences, and designing rules before beginning."
    );
  } else {
    lines.push(
      "Match maturityLevel to the child's age band. Keep directions concrete with modest planning."
    );
  }

  lines.push(
    "roleGuide.name must be activity-specific, never a generic one-word role.",
    "Write like a warm teacher: invitation → action → response."
  );

  if (rejectionTitles?.length > 0) {
    lines.push(
      `Rejected titles to avoid repeating: ${rejectionTitles
        .map((title) => `"${title}"`)
        .join(", ")}.`
    );
  }

  return lines.join("\n");
}

function preserveLibraryIds(activity) {
  const libraryId =
    activity.sharedCandidateId ||
    activity.shared_candidate_id ||
    activity.candidateId ||
    activity.candidate_id ||
    null;
  return {
    ...activity,
    // Library id stays on sharedCandidateId; impression id is minted later.
    sharedCandidateId: libraryId,
    contentHash: activity.contentHash || activity.content_hash,
  };
}

function maxTokensForCount(count) {
  const n = Math.max(
    1,
    Math.min(MAX_AI_GENERATE_COUNT, Number(count) || 1)
  );
  return Math.max(1800, Math.ceil(4500 * (n / SUGGESTION_COUNT)));
}

function resolveSuggestionSource(cacheCount, aiCount) {
  if (cacheCount > 0 && aiCount > 0) return "hybrid";
  if (cacheCount > 0) return "shared_library";
  return "openai";
}

export default function createActivitySuggestionsRouter(client) {
  router.post(
    "/activity-suggestions",
    requireAuthenticatedUser,
    ensureUserProfile,
    requirePaidSubscription,
    aiSuggestionsRateLimiter,
    async (req, res) => {
      const startedAt = Date.now();
      let msCacheLookup = 0;
      let msOpenai = 0;
      let msNormalize = 0;
      try {
        const {
          currentMoment,
          parentActivity,
          parentAvailability,
          inventory,
          kidMood,
          messLevel,
          locationPreference,
          activitySpace,
          childAgeRange,
          activityStyle,
          feedbackContext,
          generationIntent,
          previousActivityTitles,
          safetySettings,
          playModeTheme,
          activityPreferences,
          excludeCandidateIds,
          requestContext: clientRequestContext,
        } = req.body;

        const participantResolution = resolveParticipantContext(req.body);
        if (!participantResolution.ok) {
          return res.status(400).json({
            error: participantResolution.error,
            code: participantResolution.code,
          });
        }

        const resolvedActivityMode = participantResolution.mode;
        const resolvedSelectedProfiles = participantResolution.children;
        const resolvedActiveProfile =
          resolvedActivityMode === "single-child"
            ? resolvedSelectedProfiles[0]
            : null;

        const energyFromContext =
          clientRequestContext?.activity?.energyLevel ||
          generationIntent?.energyLevel ||
          null;
        const resolvedKidMood = kidMood || energyFromContext || "neutral";

        const safeActivityStyle = resolveActivityStyle(
          generationIntent?.activityStyle ||
            clientRequestContext?.activity?.style ||
            activityStyle,
          resolvedActivityMode
        );
        const safePlayModeTheme =
          typeof playModeTheme === "string" && playModeTheme.trim()
            ? playModeTheme.trim()
            : "playroom";
        const safeCurrentMoment = buildSafeCurrentMoment({
          currentMoment: clientRequestContext?.moment || currentMoment,
          parentActivity,
          parentAvailability,
          messLevel,
          activitySpace,
          safetySettings: clientRequestContext?.safety || safetySettings,
        });

        if (
          !safeCurrentMoment.parentActivity ||
          !safeCurrentMoment.availability ||
          !resolvedKidMood
        ) {
          return res.status(400).json({
            error: "Missing required fields.",
          });
        }

        if (!Array.isArray(inventory) && !Array.isArray(clientRequestContext?.inventory)) {
          return res.status(400).json({
            error: "Inventory must be an array.",
          });
        }

        const resolvedInventory = Array.isArray(clientRequestContext?.inventory)
          ? clientRequestContext.inventory
          : inventory;

        const safeFeedbackContext = expandGenerationIntent(
          generationIntent,
          feedbackContext && feedbackContext.trim() !== ""
            ? feedbackContext
            : ""
        );

        const safePreviousActivityTitles = Array.isArray(previousActivityTitles)
          ? previousActivityTitles
          : [];

        const safeSelectedChildProfiles = resolvedSelectedProfiles;
        const childrenContext = participantResolution.childrenContext;
        const childAges = participantResolution.ages;
        const groupAgeContext = getGroupAgeContext(childAges);

        const safeSafetySettings = buildSafeSafetySettings(
          safeCurrentMoment,
          clientRequestContext?.safety || safetySettings
        );

        const fitRequestContext =
          clientRequestContext && typeof clientRequestContext === "object"
            ? {
                ...clientRequestContext,
                participants: {
                  ...(clientRequestContext.participants || {}),
                  mode: resolvedActivityMode,
                  participantCount: participantResolution.participantCount,
                  children: resolvedSelectedProfiles,
                  childrenContext,
                  ages: childAges,
                },
                moment: {
                  ...(clientRequestContext.moment || {}),
                  ...safeCurrentMoment,
                },
                safety: {
                  ...(clientRequestContext.safety || {}),
                  ...safeSafetySettings,
                },
                activity: {
                  ...(clientRequestContext.activity || {}),
                  style: safeActivityStyle,
                  energyLevel: energyFromContext || resolvedKidMood,
                },
                inventory: resolvedInventory,
              }
            : buildFitRequestContextFromParts({
                participants: {
                  mode: resolvedActivityMode,
                  participantCount: participantResolution.participantCount,
                  children: resolvedSelectedProfiles,
                  childrenContext,
                  ages: childAges,
                },
                moment: safeCurrentMoment,
                safety: safeSafetySettings,
                activity: {
                  style: safeActivityStyle,
                  energyLevel: energyFromContext || resolvedKidMood,
                },
                inventory: resolvedInventory,
              });

        const safeExcludeCandidateIds = Array.isArray(excludeCandidateIds)
          ? excludeCandidateIds.map((id) => String(id)).filter(Boolean)
          : [];

        const requestMomentId =
          typeof req.body?.momentId === "string" && req.body.momentId.trim()
            ? req.body.momentId.trim()
            : typeof req.body?.moment_id === "string" &&
                req.body.moment_id.trim()
              ? req.body.moment_id.trim()
              : null;

        const oldestAge =
          childAges.length > 0 ? Math.max(...childAges) : null;

        // Cache-first pool: imaginative uses V4 narrative-valid only; legacy is last resort.
        const cacheLookupStarted = Date.now();
        let cachedCandidates = [];
        const cacheQueryBase = {
          userId: req.auth.userId,
          inventory: resolvedInventory,
          currentMoment: safeCurrentMoment,
          excludeCandidateIds: safeExcludeCandidateIds,
          activityStyle: safeActivityStyle,
          childAges,
          activityMode: resolvedActivityMode,
          requestContext: fitRequestContext,
          safetySettings: safeSafetySettings,
        };
        try {
          if (safeActivityStyle === "imaginative") {
            cachedCandidates = await querySharedCandidatesForUser({
              ...cacheQueryBase,
              cacheQualityTier: "narrative-v4",
              limit: SUGGESTION_COUNT,
            });
          } else {
            cachedCandidates = await querySharedCandidatesForUser({
              ...cacheQueryBase,
              limit: CACHE_LOOKUP_LIMIT,
            });
          }
        } catch (cacheError) {
          console.warn("Cache-first library lookup failed:", cacheError);
          cachedCandidates = [];
        }
        msCacheLookup = Date.now() - cacheLookupStarted;

        const normalizeCacheStarted = Date.now();
        const normalizedCached = (Array.isArray(cachedCandidates)
          ? cachedCandidates
          : []
        ).map((activity) =>
          enrichActivityForServe(activity, safeActivityStyle, childAges)
        );
        const cacheFitFiltered = filterActivitiesByFitPolicy(
          normalizedCached,
          fitRequestContext
        );
        let totalAgeFitRejected = cacheFitFiltered.summary.rejected;
        const cachedKept = cacheFitFiltered.activities
          .slice(0, SUGGESTION_COUNT)
          .map(preserveLibraryIds);
        msNormalize += Date.now() - normalizeCacheStarted;

        const aiSlots = SUGGESTION_COUNT - cachedKept.length;
        let aiActivities = [];
        let qualitySurvivorCount = 0;
        let usageMeta = null;
        const aiDiagnostics = {
          aiAttempted: false,
          aiRequestedCount: 0,
          aiGeneratedCount: 0,
          aiClarityRejectedCount: 0,
          aiStoryRejectedCount: 0,
          aiStoryRejectedByReason: {},
          aiNarrativeRejectedCount: 0,
          aiNarrativeRejectedByReason: {},
          aiFitRejectedCount: 0,
          aiRejectedByReason: {},
          aiEligibleCount: 0,
          initialGenerationCount: 0,
          initialGenerationMs: 0,
          narrativeRetryAttempted: false,
          narrativeRetryMs: 0,
          ageRetryAttempted: false,
          ageRetryMs: 0,
          ageRetryEligibleCount: null,
          refillAttempted: false,
          refillMs: 0,
          refillRequestedCount: 0,
          refillGeneratedCount: 0,
          refillEligibleCount: 0,
          openAiBatchCount: 0,
          openAiCallCount: 0,
        };
        const storyQualityContext = buildStoryQualityContext(
          groupAgeContext,
          childrenContext
        );
        storyQualityContext.childrenContext = childrenContext;
        storyQualityContext.activityMode = resolvedActivityMode;
        const generationSchema = resolveGenerationSchema(safeActivityStyle);

        if (aiSlots > 0) {
          const aiGenerateCount = resolveAiGenerateCount(safeActivityStyle, aiSlots);
          aiDiagnostics.aiAttempted = true;
          aiDiagnostics.aiRequestedCount = aiGenerateCount;
          aiDiagnostics.initialGenerationCount = aiGenerateCount;

          const instructions = buildActivitySuggestionsInstructions(
            safeActivityStyle,
            safePlayModeTheme,
            { childrenContext, groupAgeContext, activityCount: aiGenerateCount }
          );
          const titlesToAvoid = [
            ...safePreviousActivityTitles,
            ...cachedKept.map((a) => a.title).filter(Boolean),
          ];

          const openaiStarted = Date.now();
          let recovered;
          try {
            aiDiagnostics.openAiBatchCount += 1;
            recovered = await generateActivitiesWithParseRecovery({
              expectedCount: aiGenerateCount,
              activityStyle: safeActivityStyle,
              maxTokensForCount,
              baseFeedback: safeFeedbackContext,
              buildInput: (feedback, activityCount) =>
                buildActivitySuggestionsInput({
                  safeCurrentMoment,
                  kidMood: resolvedKidMood,
                  energyLevel: energyFromContext || resolvedKidMood,
                  locationPreference:
                    safeCurrentMoment.space || locationPreference || "",
                  childAgeRange,
                  childrenContext,
                  groupAgeContext,
                  activeChildProfile: resolvedActiveProfile,
                  safeActivityStyle,
                  activityMode: resolvedActivityMode,
                  safeSelectedChildProfiles,
                  inventory: resolvedInventory,
                  safeFeedbackContext: feedback || "",
                  safePreviousActivityTitles: titlesToAvoid,
                  safeSafetySettings,
                  playModeTheme: safePlayModeTheme,
                  activityPreferences:
                    activityPreferences && typeof activityPreferences === "object"
                      ? activityPreferences
                      : clientRequestContext?.preferences || null,
                  activityCount,
                }),
              createResponse: async ({ input: retryInput, maxOutputTokens }) => {
                aiDiagnostics.openAiCallCount += 1;
                const aiResult = await createStructuredResponseWithMeta(client, {
                  instructions,
                  input: retryInput,
                  schemaName: "activity_suggestions",
                  schema: generationSchema,
                  verbosity: "low",
                  maxOutputTokens,
                });
                if (isDebugLogging) {
                  console.log("RAW AI RESPONSE:");
                  console.log(aiResult.outputText);
                }
                return aiResult;
              },
            });
          } catch (parseError) {
            msOpenai = Date.now() - openaiStarted;
            aiDiagnostics.initialGenerationMs = msOpenai;
            if (parseError instanceof AiResponseInvalidError) {
              await recordAiUsageEvent({
                userId: req.auth.userId,
                operation: "activity-suggestions",
                model: OPENAI_MODEL,
                latencyMs: Date.now() - startedAt,
                success: false,
                error: { message: "AI_RESPONSE_INVALID", code: "AI_RESPONSE_INVALID" },
              });
              return res.status(422).json({
                error: parseError.message,
                message: parseError.message,
                code: "AI_RESPONSE_INVALID",
              });
            }
            throw parseError;
          }
          msOpenai = Date.now() - openaiStarted;
          aiDiagnostics.initialGenerationMs = msOpenai;
          usageMeta = {
            model: recovered.usage?.model || OPENAI_MODEL,
            inputTokens: recovered.usage?.inputTokens || 0,
            outputTokens: recovered.usage?.outputTokens || 0,
            totalTokens: recovered.usage?.totalTokens || 0,
            responseId: recovered.usage?.responseId || null,
            instructionChars:
              typeof instructions === "string" ? instructions.length : null,
            inputChars: null,
          };

          const rawActivities = recovered.activities;
          aiDiagnostics.aiGeneratedCount = Array.isArray(rawActivities)
            ? rawActivities.length
            : 0;

          const normalizeAiStarted = Date.now();
          const normalizedActivities = rawActivities.map((activity) =>
            enrichActivityForServe(activity, safeActivityStyle, childAges)
          );

          let clarityPassed = normalizedActivities.filter((activity) =>
            passesAiGenerationQuality(activity, {
              activityStyle: safeActivityStyle,
              storyContext: storyQualityContext,
              aiDiagnostics,
            })
          );

          // Never serve clarity-failed content. If all fail, retry once then discard.
          if (
            shouldRunNarrativeRetry({
              generatedCount: normalizedActivities.length,
              qualitySurvivorCount: clarityPassed.length,
            })
          ) {
            aiDiagnostics.narrativeRetryAttempted = true;
            const clarityRetrySteerParts = [
              "CLARITY RETRY: Previous activities failed clarity validation.",
              "Every step needs a concrete instruction, observable doneWhen, and explicit setup when materials matter.",
              "Avoid vague actions. Provide examples for open-ended choices.",
            ];
            if (safeActivityStyle === "imaginative") {
              clarityRetrySteerParts.push(
                "CAUSALITY RETRY: Previous activities failed narrative quality.",
                "Rebuild the scene sequence. Each scene must follow problem/change → necessary action → consequence.",
                "Every scene needs sceneSetup (why act now) and sceneOutcome (what changed because they succeeded).",
                "Do NOT add descriptive language to themed tasks — change the actions if they do not belong in the story.",
                ...formatQualitySteerHints(
                  Object.keys(aiDiagnostics.aiStoryRejectedByReason),
                  safeActivityStyle
                )
              );
            }
            const clarityRetrySteer = clarityRetrySteerParts.join("\n");
            const clarityRetryStarted = Date.now();
            let clarityRetryRaw = [];
            try {
              aiDiagnostics.openAiBatchCount += 1;
              const clarityRecovered = await generateActivitiesWithParseRecovery({
                expectedCount: aiGenerateCount,
                activityStyle: safeActivityStyle,
                maxTokensForCount,
                baseFeedback: [safeFeedbackContext, clarityRetrySteer]
                  .filter(Boolean)
                  .join("\n\n"),
                buildInput: (extraFeedback, activityCount) =>
                  buildActivitySuggestionsInput({
                    safeCurrentMoment,
                    kidMood: resolvedKidMood,
                    energyLevel: energyFromContext || resolvedKidMood,
                    locationPreference:
                      safeCurrentMoment.space || locationPreference || "",
                    childAgeRange,
                    childrenContext,
                    groupAgeContext,
                    activeChildProfile: resolvedActiveProfile,
                    safeActivityStyle,
                    activityMode: resolvedActivityMode,
                    safeSelectedChildProfiles,
                    inventory: resolvedInventory,
                    safeFeedbackContext: [
                      safeFeedbackContext,
                      clarityRetrySteer,
                      extraFeedback,
                    ]
                      .filter(Boolean)
                      .join("\n\n"),
                    safePreviousActivityTitles: titlesToAvoid,
                    safeSafetySettings,
                    playModeTheme: safePlayModeTheme,
                    activityPreferences:
                      activityPreferences &&
                      typeof activityPreferences === "object"
                        ? activityPreferences
                        : null,
                    activityCount,
                  }),
                createResponse: async ({
                  input: retryInput,
                  maxOutputTokens,
                }) => {
                  aiDiagnostics.openAiCallCount += 1;
                  return createStructuredResponseWithMeta(client, {
                    instructions,
                    input: retryInput,
                    schemaName: "activity_suggestions",
                    schema: generationSchema,
                    verbosity: "low",
                    maxOutputTokens,
                  });
                },
              });
              clarityRetryRaw = clarityRecovered.activities;
              usageMeta = mergeUsageMeta(usageMeta, {
                model: clarityRecovered.usage?.model,
                inputTokens: clarityRecovered.usage?.inputTokens || 0,
                outputTokens: clarityRecovered.usage?.outputTokens || 0,
                totalTokens: clarityRecovered.usage?.totalTokens || 0,
                responseId: clarityRecovered.usage?.responseId,
              });
            } catch (clarityParseError) {
              if (!(clarityParseError instanceof AiResponseInvalidError)) {
                throw clarityParseError;
              }
              clarityRetryRaw = [];
            }
            msOpenai += Date.now() - clarityRetryStarted;
            aiDiagnostics.narrativeRetryMs = Date.now() - clarityRetryStarted;
            const clarityRetryNormalized = clarityRetryRaw.map((activity) =>
              enrichActivityForServe(activity, safeActivityStyle, childAges)
            );
            clarityPassed = clarityRetryNormalized.filter((activity) =>
              passesAiGenerationQuality(activity, {
                activityStyle: safeActivityStyle,
                storyContext: storyQualityContext,
                aiDiagnostics,
              })
            );
            aiDiagnostics.aiGeneratedCount += clarityRetryRaw.length;
          }

          const qualitySurvivorCountAfterQuality = clarityPassed.length;
          qualitySurvivorCount = qualitySurvivorCountAfterQuality;

          let ageFiltered = filterActivitiesByFitPolicy(
            clarityPassed,
            fitRequestContext
          );
          totalAgeFitRejected += ageFiltered.summary.rejected;
          aiDiagnostics.aiFitRejectedCount += ageFiltered.summary.rejected || 0;
          if (ageFiltered.summary?.rejectedByReason) {
            for (const [reason, count] of Object.entries(
              ageFiltered.summary.rejectedByReason
            )) {
              aiDiagnostics.aiRejectedByReason[reason] =
                (aiDiagnostics.aiRejectedByReason[reason] || 0) + count;
            }
          }
          let eligibleActivities = ageFiltered.activities;
          let lastRejectedDetails = ageFiltered.rejected || [];

          if (
            shouldRunAgeFitRetry({
              qualitySurvivorCount,
              eligibleCount: eligibleActivities.length,
            })
          ) {
            aiDiagnostics.ageRetryAttempted = true;
            const rejectionTitles = lastRejectedDetails
              .map((detail) => detail.activity?.title)
              .filter(Boolean)
              .slice(0, 5);
            const retrySteer = buildAgeFitRetrySteer({
              oldestAge,
              childAges,
              rejectionTitles,
            });

            const retryFeedback = [safeFeedbackContext, retrySteer]
              .filter(Boolean)
              .join("\n\n");

            const retryStarted = Date.now();
            let retryRawActivities = [];
            try {
              aiDiagnostics.openAiBatchCount += 1;
              const ageRecovered = await generateActivitiesWithParseRecovery({
                expectedCount: aiGenerateCount,
                activityStyle: safeActivityStyle,
                maxTokensForCount,
                baseFeedback: retryFeedback,
                buildInput: (extraFeedback, activityCount) =>
                  buildActivitySuggestionsInput({
                    safeCurrentMoment,
                    kidMood: resolvedKidMood,
                    energyLevel: energyFromContext || resolvedKidMood,
                    locationPreference:
                      safeCurrentMoment.space || locationPreference || "",
                    childAgeRange,
                    childrenContext,
                    groupAgeContext,
                    activeChildProfile: resolvedActiveProfile,
                    safeActivityStyle,
                    activityMode: resolvedActivityMode,
                    safeSelectedChildProfiles,
                    inventory: resolvedInventory,
                    safeFeedbackContext: [retryFeedback, extraFeedback]
                      .filter(Boolean)
                      .join("\n\n"),
                    safePreviousActivityTitles: [
                      ...titlesToAvoid,
                      ...rejectionTitles,
                    ],
                    safeSafetySettings,
                    playModeTheme: safePlayModeTheme,
                    activityPreferences:
                      activityPreferences &&
                      typeof activityPreferences === "object"
                        ? activityPreferences
                        : null,
                    activityCount,
                  }),
                createResponse: async ({
                  input: retryInput,
                  maxOutputTokens,
                }) => {
                  aiDiagnostics.openAiCallCount += 1;
                  const retryResult = await createStructuredResponseWithMeta(
                    client,
                    {
                      instructions,
                      input: retryInput,
                      schemaName: "activity_suggestions",
                      schema: generationSchema,
                      verbosity: "low",
                      maxOutputTokens,
                    }
                  );
                  if (isDebugLogging) {
                    console.log("RAW AI AGE-RETRY RESPONSE:");
                    console.log(retryResult.outputText);
                  }
                  return retryResult;
                },
              });
              retryRawActivities = ageRecovered.activities;
              usageMeta = mergeUsageMeta(usageMeta, {
                model: ageRecovered.usage?.model,
                inputTokens: ageRecovered.usage?.inputTokens || 0,
                outputTokens: ageRecovered.usage?.outputTokens || 0,
                totalTokens: ageRecovered.usage?.totalTokens || 0,
                responseId: ageRecovered.usage?.responseId,
              });
              aiDiagnostics.aiGeneratedCount += retryRawActivities.length;
            } catch (ageParseError) {
              if (ageParseError instanceof AiResponseInvalidError) {
                if (cachedKept.length === 0) {
                  await recordAiUsageEvent({
                    userId: req.auth.userId,
                    operation: "activity-suggestions",
                    model: usageMeta?.model || OPENAI_MODEL,
                    inputTokens: usageMeta?.inputTokens,
                    outputTokens: usageMeta?.outputTokens,
                    totalTokens: usageMeta?.totalTokens,
                    responseId: usageMeta?.responseId,
                    latencyMs: Date.now() - startedAt,
                    success: false,
                    error: {
                      message: "AI_RESPONSE_INVALID",
                      code: "AI_RESPONSE_INVALID",
                    },
                  });
                  return res.status(422).json({
                    error: ageParseError.message,
                    message: ageParseError.message,
                    code: "AI_RESPONSE_INVALID",
                  });
                }
                retryRawActivities = [];
              } else {
                throw ageParseError;
              }
            }
            msOpenai += Date.now() - retryStarted;
            aiDiagnostics.ageRetryMs = Date.now() - retryStarted;

            const retryNormalized = retryRawActivities
              .map((activity) =>
                enrichActivityForServe(activity, safeActivityStyle, childAges)
              )
              .filter((activity) =>
                passesAiGenerationQuality(activity, {
                  activityStyle: safeActivityStyle,
                  storyContext: storyQualityContext,
                  aiDiagnostics,
                })
              );
            ageFiltered = filterActivitiesByFitPolicy(
              retryNormalized,
              fitRequestContext
            );
            totalAgeFitRejected += ageFiltered.summary.rejected;
            aiDiagnostics.aiFitRejectedCount +=
              ageFiltered.summary.rejected || 0;
            if (ageFiltered.summary?.rejectedByReason) {
              for (const [reason, count] of Object.entries(
                ageFiltered.summary.rejectedByReason
              )) {
                aiDiagnostics.aiRejectedByReason[reason] =
                  (aiDiagnostics.aiRejectedByReason[reason] || 0) + count;
              }
            }
            eligibleActivities = ageFiltered.activities;
            lastRejectedDetails = ageFiltered.rejected || [];
            aiDiagnostics.ageRetryEligibleCount = eligibleActivities.length;
          }

          // One partial-shortage refill when survivors < needed slots.
          if (
            shouldRunPartialRefill({
              qualitySurvivorCount,
              eligibleCount: eligibleActivities.length,
              aiSlots,
              ageRetryAttempted: aiDiagnostics.ageRetryAttempted,
              ageRetryEligibleCount: aiDiagnostics.ageRetryEligibleCount,
            })
          ) {
            const remaining = aiSlots - eligibleActivities.length;
            const refillCount =
              safeActivityStyle === "imaginative"
                ? remaining
                : computeAiGenerateCount(remaining);
            const rejectionTitles = lastRejectedDetails
              .map((detail) => detail.activity?.title)
              .filter(Boolean);
            const acceptedTitles = eligibleActivities
              .map((a) => a.title)
              .filter(Boolean);
            const refillSteer = buildPartialRefillSteer({
              remaining,
              rejectionTitles,
              rejectedByReason: aiDiagnostics.aiRejectedByReason,
              participantCount: childAges.length || 1,
              rejectedDetails: lastRejectedDetails,
              allowedSocialModes:
                (childAges.length || 1) >= 2
                  ? ["cooperative", "competitive", "flexible", "group", "family"]
                  : ["solo", "flexible"],
              storyRejectedByReason: aiDiagnostics.aiStoryRejectedByReason,
            });
            const refillTitlesToAvoid = [
              ...titlesToAvoid,
              ...acceptedTitles,
              ...rejectionTitles,
            ];
            const refillFeedback = [safeFeedbackContext, refillSteer]
              .filter(Boolean)
              .join("\n\n");

            aiDiagnostics.refillAttempted = true;
            aiDiagnostics.refillRequestedCount = refillCount;

            const refillInstructions = buildActivitySuggestionsInstructions(
              safeActivityStyle,
              safePlayModeTheme,
              {
                childrenContext,
                groupAgeContext,
                activityCount: refillCount,
              }
            );

            if (
              eligibleActivities.length === 0 &&
              (lastRejectedDetails.length > 0 ||
                Object.keys(aiDiagnostics.aiRejectedByReason).length > 0)
            ) {
              console.warn("[activity-suggestions:ai-rejected]", {
                aiSlots,
                kept: 0,
                rejectedByReason: aiDiagnostics.aiRejectedByReason,
                failureType: classifyFitFailureType(
                  aiDiagnostics.aiRejectedByReason
                ),
                titles: rejectionTitles.slice(0, 8),
                ...summarizeRejectedDetails(lastRejectedDetails),
              });
            } else if (eligibleActivities.length > 0) {
              console.warn("[activity-suggestions:ai-partial]", {
                aiSlots,
                kept: eligibleActivities.length,
                remaining,
                rejectedByReason: aiDiagnostics.aiRejectedByReason,
              });
            }

            const refillStarted = Date.now();
            let refillRaw = [];
            try {
              aiDiagnostics.openAiBatchCount += 1;
              const refillRecovered = await generateActivitiesWithParseRecovery({
                expectedCount: refillCount,
                activityStyle: safeActivityStyle,
                maxTokensForCount,
                baseFeedback: refillFeedback,
                buildInput: (extraFeedback, activityCount) =>
                  buildActivitySuggestionsInput({
                    safeCurrentMoment,
                    kidMood: resolvedKidMood,
                    energyLevel: energyFromContext || resolvedKidMood,
                    locationPreference:
                      safeCurrentMoment.space || locationPreference || "",
                    childAgeRange,
                    childrenContext,
                    groupAgeContext,
                    activeChildProfile: resolvedActiveProfile,
                    safeActivityStyle,
                    activityMode: resolvedActivityMode,
                    safeSelectedChildProfiles,
                    inventory: resolvedInventory,
                    safeFeedbackContext: [refillFeedback, extraFeedback]
                      .filter(Boolean)
                      .join("\n\n"),
                    safePreviousActivityTitles: refillTitlesToAvoid,
                    safeSafetySettings,
                    playModeTheme: safePlayModeTheme,
                    activityPreferences:
                      activityPreferences &&
                      typeof activityPreferences === "object"
                        ? activityPreferences
                        : null,
                    activityCount,
                  }),
                createResponse: async ({
                  input: retryInput,
                  maxOutputTokens,
                }) => {
                  aiDiagnostics.openAiCallCount += 1;
                  return createStructuredResponseWithMeta(client, {
                    instructions: refillInstructions,
                    input: retryInput,
                    schemaName: "activity_suggestions",
                    schema: generationSchema,
                    verbosity: "low",
                    maxOutputTokens,
                  });
                },
              });
              refillRaw = refillRecovered.activities;
              usageMeta = mergeUsageMeta(usageMeta, {
                model: refillRecovered.usage?.model,
                inputTokens: refillRecovered.usage?.inputTokens || 0,
                outputTokens: refillRecovered.usage?.outputTokens || 0,
                totalTokens: refillRecovered.usage?.totalTokens || 0,
                responseId: refillRecovered.usage?.responseId,
              });
            } catch (refillParseError) {
              if (!(refillParseError instanceof AiResponseInvalidError)) {
                throw refillParseError;
              }
              refillRaw = [];
            }
            msOpenai += Date.now() - refillStarted;
            aiDiagnostics.refillMs = Date.now() - refillStarted;
            aiDiagnostics.refillGeneratedCount = refillRaw.length;

            const refillClarity = refillRaw
              .map((activity) =>
                enrichActivityForServe(activity, safeActivityStyle, childAges)
              )
              .filter((activity) =>
                passesAiGenerationQuality(activity, {
                  activityStyle: safeActivityStyle,
                  storyContext: storyQualityContext,
                  aiDiagnostics,
                })
              );
            const refillFiltered = filterActivitiesByFitPolicy(
              refillClarity,
              fitRequestContext
            );
            totalAgeFitRejected += refillFiltered.summary.rejected;
            aiDiagnostics.aiFitRejectedCount +=
              refillFiltered.summary.rejected || 0;
            if (refillFiltered.summary?.rejectedByReason) {
              for (const [reason, count] of Object.entries(
                refillFiltered.summary.rejectedByReason
              )) {
                aiDiagnostics.aiRejectedByReason[reason] =
                  (aiDiagnostics.aiRejectedByReason[reason] || 0) + count;
              }
            }
            aiDiagnostics.refillEligibleCount =
              refillFiltered.activities.length;
            eligibleActivities = takeAiFill(
              eligibleActivities,
              refillFiltered.activities,
              aiSlots
            );
          }

          if (
            shouldFailAgeFit({
              qualitySurvivorCount,
              eligibleCount: eligibleActivities.length,
              cachedKeptCount: cachedKept.length,
            })
          ) {
            console.warn("[ageFit] AGE_FIT_FAILED after refill", {
              oldestAge,
              childAges,
              totalAgeFitRejected,
              failureType: classifyFitFailureType(
                aiDiagnostics.aiRejectedByReason
              ),
              details: aiDiagnostics.aiRejectedByReason,
              ...aiDiagnostics,
            });
            await recordAiUsageEvent({
              userId: req.auth.userId,
              operation: "activity-suggestions",
              model: usageMeta?.model || OPENAI_MODEL,
              inputTokens: usageMeta?.inputTokens,
              outputTokens: usageMeta?.outputTokens,
              totalTokens: usageMeta?.totalTokens,
              responseId: usageMeta?.responseId,
              latencyMs: Date.now() - startedAt,
              success: false,
              error: { message: "AGE_FIT_FAILED" },
            });
            return res.status(422).json({
              error:
                "Could not generate age-appropriate activities for this child. Try regenerating or updating interests.",
              message:
                "Could not generate age-appropriate activities for this child. Try regenerating or updating interests.",
              code: "AGE_FIT_FAILED",
              ageFitRejectedCount: totalAgeFitRejected,
            });
          }

          msNormalize += Date.now() - normalizeAiStarted;
          aiDiagnostics.aiEligibleCount = eligibleActivities.length;
          aiActivities = eligibleActivities.slice(0, aiSlots);
        }

        let legacyActivities = [];
        if (safeActivityStyle === "imaginative") {
          const missingAfterGeneration =
            SUGGESTION_COUNT - cachedKept.length - aiActivities.length;
          if (missingAfterGeneration > 0) {
            try {
              const legacyCached = await querySharedCandidatesForUser({
                ...cacheQueryBase,
                cacheQualityTier: "legacy",
                limit: missingAfterGeneration,
              });
              const normalizedLegacy = legacyCached.map((activity) =>
                enrichActivityForServe(activity, safeActivityStyle, childAges)
              );
              const legacyFitFiltered = filterActivitiesByFitPolicy(
                normalizedLegacy,
                fitRequestContext
              );
              legacyActivities = legacyFitFiltered.activities
                .slice(0, missingAfterGeneration)
                .map(preserveLibraryIds);
              totalAgeFitRejected += legacyFitFiltered.summary.rejected;
            } catch (legacyCacheError) {
              console.warn("Legacy imaginative cache fallback failed:", legacyCacheError);
            }
          }
        }

        const mergedActivities = [...cachedKept, ...aiActivities, ...legacyActivities].slice(
          0,
          SUGGESTION_COUNT
        );

        logAgeFitBatchSummary({
          ages: childAges,
          style: safeActivityStyle,
          cacheExamined: normalizedCached.length,
          ageRejected: totalAgeFitRejected,
          eligible: mergedActivities.length,
          returned: mergedActivities.length,
        });

        if (mergedActivities.length === 0) {
          return res.status(422).json({
            error: "Could not generate activity suggestions.",
            message: "Could not generate activity suggestions.",
            code: "AGE_FIT_FAILED",
            ageFitRejectedCount: totalAgeFitRejected,
          });
        }

        const source = resolveSuggestionSource(
          cachedKept.length,
          aiActivities.length
        );
        const withIds = attachRecommendationIds(mergedActivities);
        const presentedAt = new Date().toISOString();
        const activitiesWithMeta = withIds.activities.map((activity) => ({
          ...activity,
          presentedAt,
          momentId: requestMomentId,
        }));
        const recommendationBatchId = withIds.recommendationBatchId;
        const msTotal = Date.now() - startedAt;
        const finalCount = mergedActivities.length;
        const underfilled = finalCount < SUGGESTION_COUNT;
        const timing = {
          source,
          msCacheLookup,
          msOpenai,
          msNormalize,
          msTotal,
          cacheCount: cachedKept.length,
          aiCount: aiActivities.length,
          finalCount,
          underfilled,
          initialGenerationCount: aiDiagnostics.initialGenerationCount,
          initialGenerationMs: aiDiagnostics.initialGenerationMs,
          narrativeRetryAttempted: aiDiagnostics.narrativeRetryAttempted,
          narrativeRetryMs: aiDiagnostics.narrativeRetryMs,
          ageRetryAttempted: aiDiagnostics.ageRetryAttempted,
          ageRetryMs: aiDiagnostics.ageRetryMs,
          refillAttempted: aiDiagnostics.refillAttempted,
          refillMs: aiDiagnostics.refillMs,
          legacyFallbackCount: legacyActivities.length,
          openAiBatchCount: aiDiagnostics.openAiBatchCount,
          openAiCallCount: aiDiagnostics.openAiCallCount,
          aiAttempted: aiDiagnostics.aiAttempted,
          aiRequestedCount: aiDiagnostics.aiRequestedCount,
          aiGeneratedCount: aiDiagnostics.aiGeneratedCount,
          aiClarityRejectedCount: aiDiagnostics.aiClarityRejectedCount,
          aiStoryRejectedCount: aiDiagnostics.aiStoryRejectedCount,
          aiStoryRejectedByReason: aiDiagnostics.aiStoryRejectedByReason,
          aiNarrativeRejectedCount: aiDiagnostics.aiNarrativeRejectedCount,
          aiNarrativeRejectedByReason: aiDiagnostics.aiNarrativeRejectedByReason,
          aiFitRejectedCount: aiDiagnostics.aiFitRejectedCount,
          aiRejectedByReason: aiDiagnostics.aiRejectedByReason,
          aiEligibleCount: aiDiagnostics.aiEligibleCount,
          refillRequestedCount: aiDiagnostics.refillRequestedCount,
          refillGeneratedCount: aiDiagnostics.refillGeneratedCount,
          refillEligibleCount: aiDiagnostics.refillEligibleCount,
          ...(usageMeta
            ? {
                instructionChars: usageMeta.instructionChars,
                inputChars: usageMeta.inputChars,
                inputTokens: usageMeta.inputTokens,
                outputTokens: usageMeta.outputTokens,
              }
            : {}),
        };
        logSuggestionTiming(timing);

        const normalizedResponse = {
          source,
          recommendationBatchId,
          momentId: requestMomentId,
          activities: activitiesWithMeta,
          ageFitRejectedCount: totalAgeFitRejected,
          timing,
        };

        if (isDebugLogging) {
          console.log("PARSED AI RESPONSE:");
          console.log(JSON.stringify(normalizedResponse, null, 2));
        }

        res.json(normalizedResponse);

        void (async () => {
          try {
            const libraryCandidateIds = activitiesWithMeta
              .map((a) => a.sharedCandidateId || a.shared_candidate_id)
              .filter(Boolean);
            if (libraryCandidateIds.length > 0) {
              await recordCandidatesShown({
                userId: req.auth.userId,
                candidateIds: libraryCandidateIds,
              });
            }

            const aiOnly = activitiesWithMeta.filter(
              (a) => !(a.sharedCandidateId || a.shared_candidate_id)
            );
            let ingested = activitiesWithMeta;
            if (aiOnly.length > 0) {
              const ingestedAi = await ingestGeneratedActivities({
                userId: req.auth.userId,
                activities: aiOnly,
                source: "ai",
                childrenContext,
                activityMode: resolvedActivityMode,
              });
              const ingestedByTitle = new Map(
                ingestedAi.map((a) => [String(a.title || "").toLowerCase(), a])
              );
              ingested = activitiesWithMeta.map((activity) => {
                if (activity.sharedCandidateId || activity.shared_candidate_id) {
                  return activity;
                }
                const match = ingestedByTitle.get(
                  String(activity.title || "").toLowerCase()
                );
                if (!match) return activity;
                return {
                  ...activity,
                  sharedCandidateId:
                    match.sharedCandidateId ||
                    match.candidateId ||
                    activity.sharedCandidateId ||
                    null,
                  contentHash: match.contentHash || activity.contentHash,
                };
              });
            }

            let momentId = requestMomentId;
            if (!momentId) {
              const momentSnapshot = await createActivityMoment({
                userId: req.auth.userId,
                moment: safeCurrentMoment,
                kidMood: resolvedKidMood,
                childIds: safeSelectedChildProfiles
                  .map((c) => c?.id)
                  .filter(Boolean),
                rescueMode: false,
              });
              momentId = momentSnapshot?.id || null;
            }

            const batch = await createRecommendationBatch({
              userId: req.auth.userId,
              momentId,
              source,
              mode: "normal",
              model: usageMeta?.model || null,
              latencyMs: msTotal,
              activities: ingested,
              batchId: recommendationBatchId,
              generationContext: buildSanitizedGenerationContext({
                requestContext: fitRequestContext,
                participants: participantResolution,
                activityStyle: safeActivityStyle,
                energyLevel: energyFromContext || resolvedKidMood,
                sourcePath:
                  source === "shared_library" ? "cache-first" : "ai",
                requestId: fitRequestContext.requestId,
              }),
            });

            if (usageMeta) {
              await recordAiUsageEvent({
                userId: req.auth.userId,
                operation: "activity-suggestions",
                model: usageMeta.model,
                inputTokens: usageMeta.inputTokens,
                outputTokens: usageMeta.outputTokens,
                totalTokens: usageMeta.totalTokens,
                responseId: usageMeta.responseId,
                recommendationBatchId:
                  batch.recommendationBatchId || recommendationBatchId,
                latencyMs: msTotal,
                success: true,
              });
            }
          } catch (telemetryError) {
            console.warn(
              "Post-response activity telemetry failed:",
              telemetryError
            );
            if (usageMeta) {
              try {
                await recordAiUsageEvent({
                  userId: req.auth.userId,
                  operation: "activity-suggestions",
                  model: usageMeta.model,
                  inputTokens: usageMeta.inputTokens,
                  outputTokens: usageMeta.outputTokens,
                  totalTokens: usageMeta.totalTokens,
                  responseId: usageMeta.responseId,
                  recommendationBatchId,
                  latencyMs: msTotal,
                  success: true,
                  error: {
                    message: "telemetry-deferred-failed",
                    detail: String(telemetryError?.message || telemetryError),
                  },
                });
              } catch (usageError) {
                console.warn(
                  "Could not record AI usage after telemetry failure:",
                  usageError
                );
              }
            }
          }
        })();
      } catch (error) {
        console.error("AI suggestion error:", {
          status: error?.status,
          code: error?.code,
          type: error?.type,
          message: error?.message,
        });

        await recordAiUsageEvent({
          userId: req.auth?.userId,
          operation: "activity-suggestions",
          model: OPENAI_MODEL,
          latencyMs: Date.now() - startedAt,
          success: false,
          error,
        });

        const isAuthError =
          error?.status === 401 || error?.code === "invalid_api_key";

        res.status(500).json({
          error: isAuthError
            ? "OpenAI API key is missing or invalid on the server."
            : "Could not generate activity suggestions.",
        });
      }
    }
  );

  return router;
}
