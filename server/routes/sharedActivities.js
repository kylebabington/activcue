// server/routes/sharedActivities.js

import { Router } from "express";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";
import {
  querySharedCandidatesForUser,
  recordCandidateOutcome,
} from "../lib/sharedActivityLibrary.js";
import {
  createActivityMoment,
  createRecommendationBatch,
} from "../lib/recommendationTelemetry.js";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import {
  attachRecommendationIds,
} from "../lib/recommendationIds.js";
import {
  buildChildrenAgeContext,
} from "../utils/childAge.js";
import { enrichActivitiesForServe } from "../utils/enrichActivityForServe.js";
import { resolveActivityStyle } from "../utils/normalizeRequest.js";

const router = Router();

router.use(familyDataRateLimiter);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function childAgesFromBody(body) {
  if (Array.isArray(body.childAges) && body.childAges.length > 0) {
    return body.childAges
      .map((age) => Number(age))
      .filter((age) => Number.isFinite(age));
  }
  const profiles = Array.isArray(body.selectedChildProfiles)
    ? body.selectedChildProfiles
    : body.activeChildProfile
      ? [body.activeChildProfile]
      : [];
  if (profiles.length === 0) {
    return [];
  }
  return buildChildrenAgeContext(profiles).map((child) => child.ageYears);
}

/*
 * POST /api/shared-activities/plan-b
 * Pull next-best candidates from the shared library (no OpenAI call).
 */
router.post(
  "/shared-activities/plan-b",
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const childAges = childAgesFromBody(body);
      const candidates = await querySharedCandidatesForUser({
        userId: req.auth.userId,
        inventory: Array.isArray(body.inventory) ? body.inventory : [],
        currentMoment: isPlainObject(body.currentMoment)
          ? body.currentMoment
          : {},
        excludeCandidateIds: Array.isArray(body.excludeCandidateIds)
          ? body.excludeCandidateIds
          : [],
        excludeCategories: Array.isArray(body.excludeCategories)
          ? body.excludeCategories
          : [],
        childAges,
        limit: Math.min(Math.max(Number(body.limit) || 3, 1), 10),
      });

      const activityStyle = resolveActivityStyle(
        body.activityStyle || body.activity_style,
        "imaginative"
      );
      const enrichedCandidates = enrichActivitiesForServe(
        candidates,
        activityStyle,
        childAges
      );

      let momentId =
        typeof body.momentId === "string" && body.momentId.trim()
          ? body.momentId.trim()
          : null;

      if (!momentId && isPlainObject(body.currentMoment)) {
        const momentSnapshot = await createActivityMoment({
          userId: req.auth.userId,
          moment: body.currentMoment,
          kidMood: body.kidMood || null,
          childIds: Array.isArray(body.childIds) ? body.childIds : [],
          rescueMode: false,
        });
        momentId = momentSnapshot?.id || null;
      }

      const withIds = attachRecommendationIds(enrichedCandidates);
      const batch = await createRecommendationBatch({
        userId: req.auth.userId,
        momentId,
        source: "shared_library",
        mode: "normal",
        activities: withIds.activities,
        batchId: withIds.recommendationBatchId,
      });

      return res.json({
        source: "shared-library",
        recommendationBatchId: batch.recommendationBatchId,
        momentId,
        activities: batch.activities,
      });
    } catch (error) {
      console.error("Plan B library lookup failed:", error);
      return res.status(500).json({
        error: "Could not load Plan B activities.",
        code: "PLAN_B_LOOKUP_FAILED",
      });
    }
  }
);

/*
 * POST /api/shared-activities/rescue
 * Duration-focused rescue picks with low setup bias.
 */
router.post(
  "/shared-activities/rescue",
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const minutes = Number(body.minutes) || 20;
      const currentMoment = {
        ...(isPlainObject(body.currentMoment) ? body.currentMoment : {}),
        timeNeededMinutes: minutes,
        messLevel: body.currentMoment?.messLevel || "low",
        noiseLevel: body.currentMoment?.noiseLevel || "quiet",
        supervisionLevel:
          body.currentMoment?.supervisionLevel || "independent",
        availability:
          body.currentMoment?.availability || "do-not-interrupt",
      };

      let activities = await querySharedCandidatesForUser({
        userId: req.auth.userId,
        inventory: Array.isArray(body.inventory) ? body.inventory : [],
        currentMoment,
        excludeCandidateIds: Array.isArray(body.excludeCandidateIds)
          ? body.excludeCandidateIds
          : [],
        childAges: childAgesFromBody(body),
        limit: 4,
      });

      // Fall back to curated presets when library is thin.
      if (activities.length < 2) {
        const supabase = getSupabaseAdminClient();
        const { data: presets } = await supabase
          .from("preset_activities")
          .select("*")
          .eq("is_active", true)
          .lte("estimated_minutes", minutes + 5)
          .order("display_order", { ascending: true })
          .limit(4);

        const presetActivities = (presets || []).map((row) => {
          const content =
            row.full_content && typeof row.full_content === "object"
              ? row.full_content
              : {};
          return {
            ...content,
            title: row.title || content.title,
            summary: row.summary || content.summary,
            theme: row.theme || content.theme || "",
            estimatedMinutes: row.estimated_minutes,
            activityStyle: row.activity_style,
            candidateId: row.id,
            source: "preset",
          };
        });

        activities = [...activities, ...presetActivities].slice(0, 4);
      }

      const childAges = childAgesFromBody(body);
      const activityStyle = resolveActivityStyle(
        body.activityStyle || body.activity_style,
        "imaginative"
      );
      activities = enrichActivitiesForServe(
        activities,
        activityStyle,
        childAges
      );

      let momentId =
        typeof body.momentId === "string" && body.momentId.trim()
          ? body.momentId.trim()
          : null;

      if (!momentId) {
        const momentSnapshot = await createActivityMoment({
          userId: req.auth.userId,
          moment: currentMoment,
          kidMood: body.kidMood || null,
          childIds: Array.isArray(body.childIds) ? body.childIds : [],
          rescueMode: true,
        });
        momentId = momentSnapshot?.id || null;
      }

      const source =
        activities[0]?.source === "preset" ? "curated" : "shared_library";
      const withIds = attachRecommendationIds(activities);
      const batch = await createRecommendationBatch({
        userId: req.auth.userId,
        momentId,
        source,
        mode: "rescue",
        activities: withIds.activities,
        batchId: withIds.recommendationBatchId,
      });

      return res.json({
        source: activities[0]?.source || "shared-library",
        recommendationBatchId: batch.recommendationBatchId,
        momentId,
        activities: batch.activities,
        rescueMoment: currentMoment,
      });
    } catch (error) {
      console.error("Rescue lookup failed:", error);
      return res.status(500).json({
        error: "Could not load rescue activities.",
        code: "RESCUE_LOOKUP_FAILED",
      });
    }
  }
);

/*
 * POST /api/shared-activities/outcome
 */
router.post(
  "/shared-activities/outcome",
  requireAuthenticatedUser,
  ensureUserProfile,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      await recordCandidateOutcome({
        userId: req.auth.userId,
        candidateId: body.candidateId || body.candidate_id,
        outcome: body.outcome,
      });
      return res.json({ ok: true });
    } catch (error) {
      console.error("Candidate outcome failed:", error);
      return res.status(500).json({
        error: "Could not record candidate outcome.",
        code: "CANDIDATE_OUTCOME_FAILED",
      });
    }
  }
);

export default router;
