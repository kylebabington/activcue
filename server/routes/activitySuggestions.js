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
import { ingestGeneratedActivities } from "../lib/sharedActivityLibrary.js";
import {
  createActivityMoment,
  createRecommendationBatch,
} from "../lib/recommendationTelemetry.js";
import { aiSuggestionsRateLimiter } from "../middleware/rateLimits.js";

const router = Router();
const isDebugLogging = process.env.DEBUG_AI_RESPONSES === "true";

export default function createActivitySuggestionsRouter(client) {
  router.post(
    "/activity-suggestions",
    requireAuthenticatedUser,
    ensureUserProfile,
    requirePaidSubscription,
    aiSuggestionsRateLimiter,
    async (req, res) => {
      const startedAt = Date.now();
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

        const instructions = buildActivitySuggestionsInstructions(
          safeActivityStyle,
          safePlayModeTheme
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

        const aiResult = await createStructuredResponseWithMeta(client, {
          instructions,
          input,
          schemaName: "activity_suggestions",
          schema: activitySuggestionsSchema,
        });
        const rawText = aiResult.outputText;
        let usageMeta = {
          model: aiResult.model || OPENAI_MODEL,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens,
          totalTokens: aiResult.totalTokens,
          responseId: aiResult.responseId,
        };

        if (isDebugLogging) {
          console.log("RAW AI RESPONSE:");
          console.log(rawText);
        }

        const parsed = JSON.parse(rawText);
        const rawActivities = Array.isArray(parsed.activities)
          ? parsed.activities
          : [];

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
              "mission should be a short challenge brief; roleGuide.name must be activity-specific (e.g. Room Redesign Lead), never a generic one-word role like Designer, Strategist, Inventor, Explorer, or Player.",
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

            const retryResult = await createStructuredResponseWithMeta(
              client,
              {
                instructions,
                input: retryInput,
                schemaName: "activity_suggestions",
                schema: activitySuggestionsSchema,
              }
            );
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

        const withIds = attachRecommendationIds(eligibleActivities);
        const presentedAt = new Date().toISOString();
        const activitiesWithMeta = withIds.activities.map((activity) => ({
          ...activity,
          presentedAt,
        }));

        const requestMomentId =
          typeof req.body?.momentId === "string" && req.body.momentId.trim()
            ? req.body.momentId.trim()
            : typeof req.body?.moment_id === "string" && req.body.moment_id.trim()
              ? req.body.moment_id.trim()
              : null;

        const recommendationBatchId = withIds.recommendationBatchId;
        const normalizedResponse = {
          recommendationBatchId,
          momentId: requestMomentId,
          activities: activitiesWithMeta.map((activity) => ({
            ...activity,
            momentId: requestMomentId,
          })),
          ageFitRejectedCount: totalAgeFitRejected,
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
              latencyMs: Date.now() - startedAt,
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
              latencyMs: Date.now() - startedAt,
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
                latencyMs: Date.now() - startedAt,
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
