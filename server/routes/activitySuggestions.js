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
import { validateActivityClarity } from "../utils/activityClarityValidation.js";
import {
  buildSafeCurrentMoment,
  buildSafeSafetySettings,
  resolveActivityStyle,
} from "../utils/normalizeRequest.js";
import { enrichActivityForServe } from "../utils/enrichActivityForServe.js";
import {
  buildChildrenAgeContext,
  getGroupAgeContext,
} from "../utils/childAge.js";
import {
  filterActivitiesByAgePolicy,
  logAgeFitBatchSummary,
  AGE_POLICY_VERSION,
  getPolicyAgeBand,
} from "../utils/activityAgePolicy.js";
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

const router = Router();
const isDebugLogging = process.env.DEBUG_AI_RESPONSES === "true";
const SUGGESTION_COUNT = 3;
/** Over-fetch before age-fit so we still fill the pool after rejects. */
const CACHE_LOOKUP_LIMIT = 12;

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
  return {
    ...activity,
    candidateId: activity.candidateId || activity.candidate_id,
    contentHash: activity.contentHash || activity.content_hash,
    sharedCandidateId:
      activity.candidateId || activity.candidate_id || null,
  };
}

function maxTokensForCount(count) {
  const n = Math.max(1, Math.min(SUGGESTION_COUNT, Number(count) || 1));
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
          activityMode,
          activeChildProfile,
          selectedChildProfiles,
          feedbackContext,
          generationIntent,
          previousActivityTitles,
          safetySettings,
          playModeTheme,
          activityPreferences,
          excludeCandidateIds,
        } = req.body;

        const safeActivityStyle = resolveActivityStyle(
          generationIntent?.activityStyle || activityStyle,
          activityMode
        );
        const safePlayModeTheme =
          typeof playModeTheme === "string" && playModeTheme.trim()
            ? playModeTheme.trim()
            : "playroom";
        const safeCurrentMoment = buildSafeCurrentMoment({
          currentMoment,
          parentActivity,
          parentAvailability,
          messLevel,
          activitySpace,
          safetySettings,
        });

        if (
          !safeCurrentMoment.parentActivity ||
          !safeCurrentMoment.availability ||
          !kidMood
        ) {
          return res.status(400).json({
            error: "Missing required fields.",
          });
        }

        if (!Array.isArray(inventory)) {
          return res.status(400).json({
            error: "Inventory must be an array.",
          });
        }

        const safeFeedbackContext = expandGenerationIntent(
          generationIntent,
          feedbackContext && feedbackContext.trim() !== ""
            ? feedbackContext
            : ""
        );

        const safePreviousActivityTitles = Array.isArray(previousActivityTitles)
          ? previousActivityTitles
          : [];

        const safeSelectedChildProfiles = Array.isArray(selectedChildProfiles)
          ? selectedChildProfiles
          : [];

        const childrenContext = buildChildrenAgeContext(
          safeSelectedChildProfiles.length > 0
            ? safeSelectedChildProfiles
            : activeChildProfile
              ? [activeChildProfile]
              : []
        );
        const childAges = childrenContext.map((child) => child.ageYears);
        const groupAgeContext = getGroupAgeContext(childAges);

        const safeSafetySettings = buildSafeSafetySettings(
          safeCurrentMoment,
          safetySettings
        );

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

        // Cache-first pool: keep good library fits, fill remaining slots with AI.
        const cacheLookupStarted = Date.now();
        let cachedCandidates = [];
        try {
          cachedCandidates = await querySharedCandidatesForUser({
            userId: req.auth.userId,
            inventory,
            currentMoment: safeCurrentMoment,
            excludeCandidateIds: safeExcludeCandidateIds,
            activityStyle: safeActivityStyle,
            childAges,
            limit: CACHE_LOOKUP_LIMIT,
          });
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
        const cacheAgeFiltered = filterActivitiesByAgePolicy(
          normalizedCached,
          childrenContext,
          { activityMode, expectedStyle: safeActivityStyle }
        );
        let totalAgeFitRejected = cacheAgeFiltered.rejectedCount;
        const cachedKept = cacheAgeFiltered.activities
          .slice(0, SUGGESTION_COUNT)
          .map(preserveLibraryIds);
        msNormalize += Date.now() - normalizeCacheStarted;

        const aiSlots = SUGGESTION_COUNT - cachedKept.length;
        let aiActivities = [];
        let usageMeta = null;

        if (aiSlots > 0) {
          const instructions = buildActivitySuggestionsInstructions(
            safeActivityStyle,
            safePlayModeTheme,
            { childrenContext, groupAgeContext, activityCount: aiSlots }
          );
          const titlesToAvoid = [
            ...safePreviousActivityTitles,
            ...cachedKept.map((a) => a.title).filter(Boolean),
          ];
          const input = buildActivitySuggestionsInput({
            safeCurrentMoment,
            kidMood,
            locationPreference,
            childAgeRange,
            childrenContext,
            groupAgeContext,
            activeChildProfile,
            safeActivityStyle,
            activityMode,
            safeSelectedChildProfiles,
            inventory,
            safeFeedbackContext,
            safePreviousActivityTitles: titlesToAvoid,
            safeSafetySettings,
            playModeTheme: safePlayModeTheme,
            activityPreferences:
              activityPreferences && typeof activityPreferences === "object"
                ? activityPreferences
                : null,
            activityCount: aiSlots,
          });

          const openaiStarted = Date.now();
          const aiResult = await createStructuredResponseWithMeta(client, {
            instructions,
            input,
            schemaName: "activity_suggestions",
            schema: activitySuggestionsSchemaV3,
            verbosity: "low",
            maxOutputTokens: maxTokensForCount(aiSlots),
          });
          msOpenai = Date.now() - openaiStarted;
          const rawText = aiResult.outputText;
          usageMeta = {
            model: aiResult.model || OPENAI_MODEL,
            inputTokens: aiResult.inputTokens,
            outputTokens: aiResult.outputTokens,
            totalTokens: aiResult.totalTokens,
            responseId: aiResult.responseId,
            instructionChars:
              typeof instructions === "string" ? instructions.length : null,
            inputChars: typeof input === "string" ? input.length : null,
          };

          if (isDebugLogging) {
            console.log("RAW AI RESPONSE:");
            console.log(rawText);
          }

          const parsed = JSON.parse(rawText);
          const rawActivities = Array.isArray(parsed.activities)
            ? parsed.activities
            : [];

          const normalizeAiStarted = Date.now();
          const normalizedActivities = rawActivities.map((activity) =>
            enrichActivityForServe(activity, safeActivityStyle, childAges)
          );

          let clarityPassed = normalizedActivities.filter((activity) => {
            const result = validateActivityClarity(activity);
            if (!result.valid) {
              console.warn("[clarity] rejected", {
                title: activity?.title,
                errors: result.errors,
              });
            }
            return result.valid;
          });

          // Never serve clarity-failed content. If all fail, retry once then discard.
          if (clarityPassed.length === 0 && normalizedActivities.length > 0) {
            const clarityRetrySteer = [
              "CLARITY RETRY: Previous activities failed clarity validation.",
              "Every step needs a concrete instruction, observable doneWhen, and explicit setup when materials matter.",
              "Avoid vague actions. Provide examples for open-ended choices.",
            ].join("\n");
            const clarityRetryInput = buildActivitySuggestionsInput({
              safeCurrentMoment,
              kidMood,
              locationPreference,
              childAgeRange,
              childrenContext,
              groupAgeContext,
              activeChildProfile,
              safeActivityStyle,
              activityMode,
              safeSelectedChildProfiles,
              inventory,
              safeFeedbackContext: [safeFeedbackContext, clarityRetrySteer]
                .filter(Boolean)
                .join("\n\n"),
              safePreviousActivityTitles: titlesToAvoid,
              safeSafetySettings,
              playModeTheme: safePlayModeTheme,
              activityPreferences:
                activityPreferences && typeof activityPreferences === "object"
                  ? activityPreferences
                  : null,
              activityCount: aiSlots,
            });
            const clarityRetryStarted = Date.now();
            const clarityRetryResult = await createStructuredResponseWithMeta(
              client,
              {
                instructions,
                input: clarityRetryInput,
                schemaName: "activity_suggestions",
                schema: activitySuggestionsSchemaV3,
                verbosity: "low",
                maxOutputTokens: maxTokensForCount(aiSlots),
              }
            );
            msOpenai += Date.now() - clarityRetryStarted;
            usageMeta = {
              model: clarityRetryResult.model || usageMeta.model,
              inputTokens:
                (usageMeta.inputTokens || 0) +
                (clarityRetryResult.inputTokens || 0),
              outputTokens:
                (usageMeta.outputTokens || 0) +
                (clarityRetryResult.outputTokens || 0),
              totalTokens:
                (usageMeta.totalTokens || 0) +
                (clarityRetryResult.totalTokens || 0),
              responseId:
                clarityRetryResult.responseId || usageMeta.responseId,
              instructionChars: usageMeta.instructionChars,
              inputChars: usageMeta.inputChars,
            };
            const clarityRetryParsed = JSON.parse(clarityRetryResult.outputText);
            const clarityRetryRaw = Array.isArray(clarityRetryParsed.activities)
              ? clarityRetryParsed.activities
              : [];
            const clarityRetryNormalized = clarityRetryRaw.map((activity) =>
              enrichActivityForServe(activity, safeActivityStyle, childAges)
            );
            clarityPassed = clarityRetryNormalized.filter((activity) =>
              validateActivityClarity(activity).valid
            );
          }

          let ageFiltered = filterActivitiesByAgePolicy(
            clarityPassed,
            childrenContext,
            { activityMode, expectedStyle: safeActivityStyle }
          );
          totalAgeFitRejected += ageFiltered.rejectedCount;
          let eligibleActivities = ageFiltered.activities;

          if (eligibleActivities.length === 0) {
            const rejectionTitles = (ageFiltered.rejectionDetails || [])
              .map((detail) => detail.title)
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

            const retryInput = buildActivitySuggestionsInput({
              safeCurrentMoment,
              kidMood,
              locationPreference,
              childAgeRange,
              childrenContext,
              groupAgeContext,
              activeChildProfile,
              safeActivityStyle,
              activityMode,
              safeSelectedChildProfiles,
              inventory,
              safeFeedbackContext: retryFeedback,
              safePreviousActivityTitles: [
                ...titlesToAvoid,
                ...rejectionTitles,
              ],
              safeSafetySettings,
              playModeTheme: safePlayModeTheme,
              activityPreferences:
                activityPreferences && typeof activityPreferences === "object"
                  ? activityPreferences
                  : null,
              activityCount: aiSlots,
            });

            const retryStarted = Date.now();
            const retryResult = await createStructuredResponseWithMeta(
              client,
              {
                instructions,
                input: retryInput,
                schemaName: "activity_suggestions",
                schema: activitySuggestionsSchemaV3,
                verbosity: "low",
                maxOutputTokens: maxTokensForCount(aiSlots),
              }
            );
            msOpenai += Date.now() - retryStarted;
            const retryRawText = retryResult.outputText;
            usageMeta = {
              model: retryResult.model || usageMeta.model,
              inputTokens:
                (usageMeta.inputTokens || 0) + (retryResult.inputTokens || 0),
              outputTokens:
                (usageMeta.outputTokens || 0) +
                (retryResult.outputTokens || 0),
              totalTokens:
                (usageMeta.totalTokens || 0) + (retryResult.totalTokens || 0),
              responseId: retryResult.responseId || usageMeta.responseId,
              instructionChars: usageMeta.instructionChars,
              inputChars: usageMeta.inputChars,
            };

            if (isDebugLogging) {
              console.log("RAW AI AGE-RETRY RESPONSE:");
              console.log(retryRawText);
            }

            const retryParsed = JSON.parse(retryRawText);
            const retryRawActivities = Array.isArray(retryParsed.activities)
              ? retryParsed.activities
              : [];
            const retryNormalized = retryRawActivities
              .map((activity) =>
                enrichActivityForServe(activity, safeActivityStyle, childAges)
              )
              .filter((activity) => validateActivityClarity(activity).valid);
            ageFiltered = filterActivitiesByAgePolicy(
              retryNormalized,
              childrenContext,
              { activityMode, expectedStyle: safeActivityStyle }
            );
            totalAgeFitRejected += ageFiltered.rejectedCount;
            eligibleActivities = ageFiltered.activities;

            if (eligibleActivities.length === 0 && cachedKept.length === 0) {
              console.warn("[ageFit] AGE_FIT_FAILED after retry", {
                oldestAge,
                childAges,
                totalAgeFitRejected,
                details: ageFiltered.rejectionDetails,
              });
              await recordAiUsageEvent({
                userId: req.auth.userId,
                operation: "activity-suggestions",
                model: usageMeta.model,
                inputTokens: usageMeta.inputTokens,
                outputTokens: usageMeta.outputTokens,
                totalTokens: usageMeta.totalTokens,
                responseId: usageMeta.responseId,
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
          }
          msNormalize += Date.now() - normalizeAiStarted;

          aiActivities = eligibleActivities.slice(0, aiSlots);
        }

        const mergedActivities = [...cachedKept, ...aiActivities].slice(
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
        const timing = {
          source,
          msCacheLookup,
          msOpenai,
          msNormalize,
          msTotal,
          cacheCount: cachedKept.length,
          aiCount: aiActivities.length,
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
              .map((a) => a.candidateId || a.sharedCandidateId)
              .filter(Boolean);
            if (libraryCandidateIds.length > 0) {
              await recordCandidatesShown({
                userId: req.auth.userId,
                candidateIds: libraryCandidateIds,
              });
            }

            const aiOnly = activitiesWithMeta.filter(
              (a) => !(a.candidateId || a.sharedCandidateId)
            );
            let ingested = activitiesWithMeta;
            if (aiOnly.length > 0) {
              const ingestedAi = await ingestGeneratedActivities({
                userId: req.auth.userId,
                activities: aiOnly,
                source: "ai",
                childrenContext,
                activityMode,
              });
              const ingestedByTitle = new Map(
                ingestedAi.map((a) => [String(a.title || "").toLowerCase(), a])
              );
              ingested = activitiesWithMeta.map((activity) => {
                if (activity.candidateId || activity.sharedCandidateId) {
                  return activity;
                }
                const match = ingestedByTitle.get(
                  String(activity.title || "").toLowerCase()
                );
                return match || activity;
              });
            }

            let momentId = requestMomentId;
            if (!momentId) {
              const momentSnapshot = await createActivityMoment({
                userId: req.auth.userId,
                moment: safeCurrentMoment,
                kidMood,
                childIds: [
                  ...(activeChildProfile?.id ? [activeChildProfile.id] : []),
                  ...safeSelectedChildProfiles
                    .map((c) => c?.id)
                    .filter(Boolean),
                ],
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
              generationContext: {
                participantAges: childAges,
                ageBands: childAges.map((age) => getPolicyAgeBand(age)),
                activityMode,
                activityStyle: safeActivityStyle,
                sourcePath: source === "shared_library" ? "cache-first" : "ai",
                agePolicyVersion: AGE_POLICY_VERSION,
              },
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
