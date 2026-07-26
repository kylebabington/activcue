import { Router } from "express";
import { createStructuredResponse } from "../lib/openaiClient.js";
import {
  buildQuestStepHintInput,
  buildQuestStepHintInstructions,
} from "../prompts/questStepHint.js";
import { questStepHintSchema } from "../schemas/questStepHintSchema.js";

const router = Router();

export default function createQuestStepHintRouter(client) {
  router.post("/quest-step-hint", async (req, res) => {
    try {
      const {
        activeActivity,
        currentStep,
        currentStepNumber,
        totalSteps,
        currentMoment,
        activeChildProfile,
        inventory,
      } = req.body;

      if (!activeActivity || !currentStep) {
        return res.status(400).json({
          error: "Missing active activity or current step.",
        });
      }

      const safeCurrentMoment = currentMoment || {};
      const instructions = buildQuestStepHintInstructions();
      const input = buildQuestStepHintInput({
        activeActivity,
        currentStep,
        currentStepNumber,
        totalSteps,
        safeCurrentMoment,
        activeChildProfile,
        inventory,
      });

      const rawText = await createStructuredResponse(client, {
        instructions,
        input,
        schemaName: "quest_step_hint",
        schema: questStepHintSchema,
      });

      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error) {
      console.error("Quest step hint error:", error);

      res.status(500).json({
        error: "Could not generate quest step hint.",
      });
    }
  });

  return router;
}
