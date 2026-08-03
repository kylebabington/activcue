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
import { recordAiUsageEvent } from "../lib/aiUsage.js";
import { expandGenerationIntent } from "../lib/generationIntent.js";
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
          activeChildProfile,
          safeActivityStyle,
          activityMode,
          safeSelectedChildProfiles,
          inventory,
          safeFeedbackContext,
          safePreviousActivityTitles,
          safeSafetySettings,
          playModeTheme: safePlayModeTheme,
        });

        const aiResult = await createStructuredResponseWithMeta(client, {
          instructions,
          input,
          schemaName: "activity_suggestions",
          schema: activitySuggestionsSchema,
        });
        const rawText = aiResult.outputText;

        if (isDebugLogging) {
          console.log("RAW AI RESPONSE:");
          console.log(rawText);
        }

        const parsed = JSON.parse(rawText);
        const rawActivities = Array.isArray(parsed.activities)
          ? parsed.activities
          : [];

        const normalizedActivities = rawActivities.map((activity) =>
          normalizeActivity(activity, safeActivityStyle)
        );

        const normalizedResponse = {
          ...parsed,
          activities: normalizedActivities,
        };

        if (isDebugLogging) {
          console.log("PARSED AI RESPONSE:");
          console.log(JSON.stringify(normalizedResponse, null, 2));
        }

        res.json(normalizedResponse);
        await recordAiUsageEvent({
          userId: req.auth.userId,
          operation: "activity-suggestions",
          model: aiResult.model || OPENAI_MODEL,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens,
          latencyMs: aiResult.latencyMs,
          success: true,
        });
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
