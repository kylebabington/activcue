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
import { activitySuggestionsSchema } from "../schemas/activitySuggestionsSchema.js";
import {
  buildSafeCurrentMoment,
  buildSafeSafetySettings,
  normalizeActivity,
  resolveActivityStyle,
} from "../utils/normalizeRequest.js";
import {
  buildChildrenAgeContext,
  getGroupAgeContext,
} from "../utils/childAge.js";
import { filterActivitiesByAgeFit } from "../utils/ageFitValidation.js";
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
const CACHE_FIRST_MIN = 3;

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

        // Cache-first: serve shared-library fits unless Not this / started / excluded.
        const cacheLookupStarted = Date.now();
        let cachedCandidates = [];
        try {
          cachedCandidates = await querySharedCandidatesForUser({
            userId: req.auth.userId,
            inventory,
            currentMoment: safeCurrentMoment,
            excludeCandidateIds: safeExcludeCandidateIds,
            activityStyle: safeActivityStyle,
            limit: CACHE_FIRST_MIN,
          });
        } catch (cacheError) {
          console.warn("Cache-first library lookup failed:", cacheError);
          cachedCandidates = [];
        }
        msCacheLookup = Date.now() - cacheLookupStarted;

        if (
          Array.isArray(cachedCandidates) &&
          cachedCandidates.length >= CACHE_FIRST_MIN
        ) {
          const normalizeStarted = Date.now();
          const normalizedCached = cachedCandidates
            .slice(0, CACHE_FIRST_MIN)
            .map((activity) =>
              normalizeActivity(activity, safeActivityStyle, childAges)
            );
          msNormalize = Date.now() - normalizeStarted;

          const withIds = attachRecommendationIds(
            normalizedCached.map((activity) => ({
              ...activity,
              // Preserve library candidate id for impression / reject tracking.
              candidateId: activity.candidateId || activity.candidate_id,
              contentHash: activity.contentHash || activity.content_hash,
              sharedCandidateId:
                activity.candidateId || activity.candidate_id || null,
            }))
          );
          const presentedAt = new Date().toISOString();
          const activitiesWithMeta = withIds.activities.map((activity) => ({
            ...activity,
            presentedAt,
            momentId: requestMomentId,
          }));
          const recommendationBatchId = withIds.recommendationBatchId;
          const msTotal = Date.now() - startedAt;

          logSuggestionTiming({
            source: "shared_library",
            msCacheLookup,
            msOpenai: 0,
            msNormalize,
            msTotal,
            candidateCount: activitiesWithMeta.length,
          });

          res.json({
            source: "shared_library",
            recommendationBatchId,
            momentId: requestMomentId,
            activities: activitiesWithMeta,
            ageFitRejectedCount: 0,
            timing: {
              source: "shared_library",
              msCacheLookup,
              msOpenai: 0,
              msNormalize,
              msTotal,
            },
          });

          void (async () => {
            try {
              await recordCandidatesShown({
                userId: req.auth.userId,
                candidateIds: activitiesWithMeta.map((a) => a.candidateId),
              });

              let momentId = requestMomentId;
              if (!momentId) {
                const momentSnapshot = await createActivityMoment({
                  userId: req.auth.userId,
                  moment: safeCurrentMoment,
                  kidMood,
                  childIds: [
                    ...(activeChildProfile?.id
                      ? [activeChildProfile.id]
                      : []),
                    ...safeSelectedChildProfiles
                      .map((c) => c?.id)
                      .filter(Boolean),
                  ],
                  rescueMode: false,
                });
                momentId = momentSnapshot?.id || null;
              }

              await createRecommendationBatch({
                userId: req.auth.userId,
                momentId,
                source: "shared_library",
                mode: "normal",
                latencyMs: msTotal,
                activities: activitiesWithMeta,
                batchId: recommendationBatchId,
              });
            } catch (telemetryError) {
              console.warn(
                "Post-response cache-hit telemetry failed:",
                telemetryError
              );
            }
          })();

          return;
        }

        const instructions = buildActivitySuggestionsInstructions(
          safeActivityStyle,
          safePlayModeTheme,
          { childrenContext, groupAgeContext }
        );
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
          safePreviousActivityTitles,
          safeSafetySettings,
          playModeTheme: safePlayModeTheme,
          activityPreferences:
            activityPreferences && typeof activityPreferences === "object"
              ? activityPreferences
              : null,
        });

        const openaiStarted = Date.now();
        const aiResult = await createStructuredResponseWithMeta(client, {
          instructions,
          input,
          schemaName: "activity_suggestions",
          schema: activitySuggestionsSchema,
          verbosity: "low",
          maxOutputTokens: 4500,
        });
        msOpenai = Date.now() - openaiStarted;
        const rawText = aiResult.outputText;
        let usageMeta = {
          model: aiResult.model || OPENAI_MODEL,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens,
          totalTokens: aiResult.totalTokens,
          responseId: aiResult.responseId,
          instructionChars: typeof instructions === "string" ? instructions.length : null,
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

        const normalizeStarted = Date.now();
        const normalizedActivities = rawActivities.map((activity) =>
          normalizeActivity(activity, safeActivityStyle, childAges)
        );

        let ageFiltered = filterActivitiesByAgeFit(
          normalizedActivities,
          childrenContext
        );
        let totalAgeFitRejected = ageFiltered.rejectedCount;

        const oldestAge =
          childAges.length > 0 ? Math.max(...childAges) : null;
        const enforceTeenAgeFit =
          Number.isFinite(oldestAge) && oldestAge >= 12;

        let eligibleActivities = ageFiltered.activities;

        if (eligibleActivities.length === 0) {
          if (enforceTeenAgeFit) {
            const rejectionTitles = (ageFiltered.rejectionDetails || [])
              .map((detail) => detail.title)
              .filter(Boolean)
              .slice(0, 5);
            const retrySteer = [
              "AGE RETRY: The previous activity batch was rejected for age fit or voice quality.",
              "Suggest mature alternatives for ages 12+.",
              "Avoid blanket forts, cozy forts, blanket/pillow caves, dens, hideouts, stuffed-animal play, magical castles, and other young-child framing.",
              "For imaginative style: do NOT invent pretend story worlds or fantasy roleplay. Use creative thinking challenges — design briefs, strategy, invention, puzzles, skill challenges.",
              "Prefer autonomy, strategy, design, building, cooking, photography, music, outdoor exploration, or skill challenges.",
              "roleGuide.name must be activity-specific (e.g. Room Redesign Lead), never a generic one-word role like Designer, Strategist, Inventor, Explorer, or Player.",
              "Write like a warm teacher: invitation → action → response. doneWhen must be a natural transition cue, never phrases like \"something in the story has changed\" or \"the objective is complete.\"",
              rejectionTitles.length > 0
                ? `Rejected titles to avoid repeating: ${rejectionTitles
                    .map((title) => `"${title}"`)
                    .join(", ")}.`
                : "",
            ]
              .filter(Boolean)
              .join("\n");

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
                ...safePreviousActivityTitles,
                ...rejectionTitles,
              ],
              safeSafetySettings,
              playModeTheme: safePlayModeTheme,
              activityPreferences:
                activityPreferences && typeof activityPreferences === "object"
                  ? activityPreferences
                  : null,
            });

            const retryStarted = Date.now();
            const retryResult = await createStructuredResponseWithMeta(
              client,
              {
                instructions,
                input: retryInput,
                schemaName: "activity_suggestions",
                schema: activitySuggestionsSchema,
                verbosity: "low",
                maxOutputTokens: 4500,
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
            const retryNormalized = retryRawActivities.map((activity) =>
              normalizeActivity(activity, safeActivityStyle, childAges)
            );
            ageFiltered = filterActivitiesByAgeFit(
              retryNormalized,
              childrenContext
            );
            totalAgeFitRejected += ageFiltered.rejectedCount;
            eligibleActivities = ageFiltered.activities;

            if (eligibleActivities.length === 0) {
              console.warn("[ageFit] age retry still empty for 12+", {
                oldestAge,
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
                error: { message: "age-fit-empty-after-retry" },
              });
              return res.status(422).json({
                error:
                  "Could not generate age-appropriate activities for this child. Try regenerating or updating interests.",
                message:
                  "Could not generate age-appropriate activities for this child. Try regenerating or updating interests.",
                ageFitRejectedCount: totalAgeFitRejected,
              });
            }
          } else {
            // Younger kids / unknown ages: keep normalized batch so the family still gets ideas.
            eligibleActivities = normalizedActivities;
          }
        }
        msNormalize = Date.now() - normalizeStarted;

        const withIds = attachRecommendationIds(eligibleActivities);
        const presentedAt = new Date().toISOString();
        const activitiesWithMeta = withIds.activities.map((activity) => ({
          ...activity,
          presentedAt,
        }));

        const recommendationBatchId = withIds.recommendationBatchId;
        const msTotal = Date.now() - startedAt;
        const timing = {
          source: "openai",
          msCacheLookup,
          msOpenai,
          msNormalize,
          msTotal,
          instructionChars: usageMeta.instructionChars,
          inputChars: usageMeta.inputChars,
          inputTokens: usageMeta.inputTokens,
          outputTokens: usageMeta.outputTokens,
        };
        logSuggestionTiming(timing);

        const normalizedResponse = {
          source: "openai",
          recommendationBatchId,
          momentId: requestMomentId,
          activities: activitiesWithMeta.map((activity) => ({
            ...activity,
            momentId: requestMomentId,
          })),
          ageFitRejectedCount: totalAgeFitRejected,
          timing,
        };

        if (isDebugLogging) {
          console.log("PARSED AI RESPONSE:");
          console.log(JSON.stringify(normalizedResponse, null, 2));
        }

        // Return activities immediately; persist library + telemetry in the background.
        res.json(normalizedResponse);

        void (async () => {
          try {
            const ingested = await ingestGeneratedActivities({
              userId: req.auth.userId,
              activities: activitiesWithMeta,
              source: "ai",
            });

            let momentId = requestMomentId;
            if (!momentId) {
              const momentSnapshot = await createActivityMoment({
                userId: req.auth.userId,
                moment: safeCurrentMoment,
                kidMood,
                childIds: [
                  ...(activeChildProfile?.id ? [activeChildProfile.id] : []),
                  ...safeSelectedChildProfiles.map((c) => c?.id).filter(Boolean),
                ],
                rescueMode: false,
              });
              momentId = momentSnapshot?.id || null;
            }

            const batch = await createRecommendationBatch({
              userId: req.auth.userId,
              momentId,
              source: "openai",
              mode: "normal",
              model: usageMeta.model || OPENAI_MODEL,
              latencyMs: msTotal,
              activities: ingested,
              batchId: recommendationBatchId,
            });

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
          } catch (telemetryError) {
            console.warn(
              "Post-response activity telemetry failed:",
              telemetryError
            );
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
              console.warn("Could not record AI usage after telemetry failure:", usageError);
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
