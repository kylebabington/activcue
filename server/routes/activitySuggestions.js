import { Router } from "express";
import { createStructuredResponse } from "../lib/openaiClient.js";
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

const router = Router();
const isDebugLogging = process.env.DEBUG_AI_RESPONSES === "true";

export default function createActivitySuggestionsRouter(client) {
  router.post("/activity-suggestions", async (req, res) => {
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
        previousActivityTitles,
        safetySettings,
      } = req.body;

      const safeActivityStyle = resolveActivityStyle(activityStyle, activityMode);
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

      const safeFeedbackContext =
        feedbackContext && feedbackContext.trim() !== ""
          ? feedbackContext
          : "No specific feedback yet.";

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

      const instructions =
        buildActivitySuggestionsInstructions(safeActivityStyle);
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
      });

      const rawText = await createStructuredResponse(client, {
        instructions,
        input,
        schemaName: "activity_suggestions",
        schema: activitySuggestionsSchema,
      });

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
    } catch (error) {
      console.error("AI suggestion error:", error);

      res.status(500).json({
        error: "Could not generate activity suggestions.",
      });
    }
  });

  return router;
}
