// server/routes/feedback.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import {
  FeedbackSubmitError,
  parseFeedbackInput,
  submitUserFeedback,
} from "../lib/submitUserFeedback.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { feedbackRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

router.post(
  "/feedback",
  requireAuthenticatedUser,
  ensureUserProfile,
  feedbackRateLimiter,
  async (req, res) => {
    const parsed = parseFeedbackInput(req.body);
    if (parsed.error) {
      return res.status(400).json({
        error: parsed.error.message,
        code: parsed.error.code,
      });
    }

    try {
      const result = await submitUserFeedback({
        supabase: getSupabaseAdminClient(),
        userId: req.auth.userId,
        category: parsed.category,
        message: parsed.message,
        page: parsed.page,
      });

      return res.status(result.duplicate ? 200 : 201).json({ id: result.id });
    } catch (error) {
      if (error instanceof FeedbackSubmitError) {
        if (error.status >= 500) {
          console.error("Could not submit user feedback:", error);
        }
        return res.status(error.status).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error("Unexpected feedback create failure:", error);
      return res.status(500).json({
        error: "Could not send feedback.",
        code: "FEEDBACK_CREATE_FAILED",
      });
    }
  }
);

export default router;
