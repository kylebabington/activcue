import { Router } from "express";
import {
  OPENAI_MODEL,
  createStructuredResponseWithMeta,
} from "../lib/openaiClient.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { requirePaidSubscription } from "../middleware/requirePaidSubscription.js";
import {
  buildQuestStepHintInput,
  buildQuestStepHintInstructions,
} from "../prompts/questStepHint.js";
import { questStepHintSchema } from "../schemas/questStepHintSchema.js";
import { aiHintsRateLimiter } from "../middleware/rateLimits.js";
import { recordAiUsageEvent } from "../lib/aiUsage.js";

const router = Router();

export default function createQuestStepHintRouter(client) {
  router.post(
    "/quest-step-hint",
    requireAuthenticatedUser,
    ensureUserProfile,
    requirePaidSubscription,
    aiHintsRateLimiter,
    async (req, res) => {
      const startedAt = Date.now();
      try {
        const {
          activeActivity,
          currentStep,
          currentStepTitle,
          currentStepInstruction,
          currentStepNumber,
          totalSteps,
          starterIdeas,
          previousHints,
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
          currentStepTitle,
          currentStepInstruction,
          currentStepNumber,
          totalSteps,
          starterIdeas,
          previousHints,
          safeCurrentMoment,
          activeChildProfile,
          inventory,
        });

        const aiResult = await createStructuredResponseWithMeta(client, {
          instructions,
          input,
          schemaName: "quest_step_hint",
          schema: questStepHintSchema,
        });

        const parsed = JSON.parse(aiResult.outputText);
        res.json(parsed);
        await recordAiUsageEvent({
          userId: req.auth.userId,
          operation: "quest-step-hint",
          model: aiResult.model || OPENAI_MODEL,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens,
          totalTokens: aiResult.totalTokens,
          responseId: aiResult.responseId,
          latencyMs: aiResult.latencyMs,
          success: true,
        });
      } catch (error) {
        console.error("Quest step hint error:", {
          status: error?.status,
          code: error?.code,
          type: error?.type,
          message: error?.message,
        });

        await recordAiUsageEvent({
          userId: req.auth?.userId,
          operation: "quest-step-hint",
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
            : "Could not generate quest step hint.",
        });
      }
    }
  );

  return router;
}
