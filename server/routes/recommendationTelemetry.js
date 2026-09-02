// server/routes/recommendationTelemetry.js

import { Router } from "express";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";
import {
  createActivityMoment,
  createRecommendationBatch,
  formatActivityMoment,
} from "../lib/recommendationTelemetry.js";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";

const router = Router();

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/*
 * POST /api/activity-moments
 * Snapshot the parent's current situation (immutable).
 */
router.post(
  "/activity-moments",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const moment = await createActivityMoment({
        userId: req.auth.userId,
        moment: isPlainObject(body.moment)
          ? body.moment
          : isPlainObject(body.currentMoment)
            ? body.currentMoment
            : body,
        childIds: Array.isArray(body.childIds) ? body.childIds : [],
        kidMood: body.kidMood || null,
        rescueMode: Boolean(body.rescueMode),
      });

      if (!moment) {
        return res.status(500).json({
          error: "Could not create activity moment.",
          code: "ACTIVITY_MOMENT_CREATE_FAILED",
        });
      }

      return res.status(201).json({ moment });
    } catch (error) {
      console.error("Activity moment create failed:", error);
      return res.status(500).json({
        error: "Could not create activity moment.",
        code: "ACTIVITY_MOMENT_CREATE_FAILED",
      });
    }
  }
);

/*
 * GET /api/activity-moments/:id
 */
router.get(
  "/activity-moments/:id",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const momentId = String(req.params.id || "").trim();
      if (!momentId) {
        return res.status(400).json({
          error: "moment id is required.",
          code: "ACTIVITY_MOMENT_INVALID",
        });
      }

      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("activity_moments")
        .select("*")
        .eq("user_id", req.auth.userId)
        .eq("id", momentId)
        .maybeSingle();

      if (error) {
        console.error("Could not load activity moment:", error);
        return res.status(500).json({
          error: "Could not load activity moment.",
          code: "ACTIVITY_MOMENT_LOAD_FAILED",
        });
      }

      if (!data) {
        return res.status(404).json({
          error: "Activity moment not found.",
          code: "ACTIVITY_MOMENT_NOT_FOUND",
        });
      }

      return res.json({ moment: formatActivityMoment(data) });
    } catch (error) {
      console.error("Activity moment load failed:", error);
      return res.status(500).json({
        error: "Could not load activity moment.",
        code: "ACTIVITY_MOMENT_LOAD_FAILED",
      });
    }
  }
);

/*
 * POST /api/recommendation-batches
 * Record a local/curated/template recommendation batch shown to the user.
 */
router.post(
  "/recommendation-batches",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const activities = Array.isArray(body.activities) ? body.activities : [];

      if (activities.length === 0) {
        return res.status(400).json({
          error: "activities are required.",
          code: "RECOMMENDATION_BATCH_INVALID",
        });
      }

      const result = await createRecommendationBatch({
        userId: req.auth.userId,
        momentId: body.momentId || body.moment_id || null,
        source: body.source || "templates",
        mode: body.mode || "normal",
        model: body.model || null,
        latencyMs: body.latencyMs ?? body.latency_ms ?? null,
        activities,
        batchId: body.recommendationBatchId || body.recommendation_batch_id || null,
      });

      return res.status(201).json({
        recommendationBatchId: result.recommendationBatchId,
        momentId: result.momentId || body.momentId || null,
        activities: result.activities,
      });
    } catch (error) {
      console.error("Recommendation batch create failed:", error);
      return res.status(500).json({
        error: "Could not create recommendation batch.",
        code: "RECOMMENDATION_BATCH_CREATE_FAILED",
      });
    }
  }
);

export default router;
