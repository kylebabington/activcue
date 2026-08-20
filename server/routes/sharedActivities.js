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
import {
  filterActivitiesByAgePolicy,
} from "../utils/activityAgePolicy.js";
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

function childrenContextFromBody(body) {
  const profiles = Array.isArray(body.selectedChildProfiles)
    ? body.selectedChildProfiles
    : body.activeChildProfile
      ? [body.activeChildProfile]
      : [];
  if (profiles.length > 0) {
    return buildChildrenAgeContext(profiles);
  }
  return childAgesFromBody(body).map((ageYears, index) => ({
    name: `Child${index + 1}`,
    ageYears,
  }));
}

function resolveActivityMode(body) {
  const mode = String(body.activityMode || body.activity_mode || "").trim();
  if (mode) return mode;
  const ages = childAgesFromBody(body);
  return ages.length > 1 ? "family" : "single-child";
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
      const childrenContext = childrenContextFromBody(body);
      const activityMode = resolveActivityMode(body);
      const activityStyle = resolveActivityStyle(
        body.activityStyle || body.activity_style,
        "imaginative"
      );

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
        activityStyle,
        childAges,
        activityMode,
        limit: Math.min(Math.max(Number(body.limit) || 3, 1), 10),
      });

      const enrichedCandidates = enrichActivitiesForServe(
        candidates,
        activityStyle,
        childAges
      );

      const policyFiltered = filterActivitiesByAgePolicy(
        enrichedCandidates,
        childrenContext,
        { activityMode, expectedStyle: activityStyle }
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
          childIds: Array.isArray(body.childIds)
            ? body.childIds
            : childrenContext.map((c) => c.id).filter(Boolean),
          rescueMode: false,
        });
        momentId = momentSnapshot?.id || null;
      }

      const withIds = attachRecommendationIds(policyFiltered.activities);
      const batch = await createRecommendationBatch({
        userId: req.auth.userId,
        momentId,
        source: "shared_library",
        mode: "normal",
        activities: withIds.activities,
        batchId: withIds.recommendationBatchId,
        generationContext: {
          participantAges: childAges,
          ageBands: childAges.map((age) => {
            if (age <= 5) return "young-child";
            if (age <= 7) return "early-elementary";
            if (age <= 9) return "elementary";
            if (age <= 11) return "older-elementary";
            if (age === 12) return "tween";
            if (age <= 14) return "young-teen";
            return "teen";
          }),
          activityMode,
          activityStyle,
          sourcePath: "plan-b",
          agePolicyVersion: 2,
        },
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
      const childAges = childAgesFromBody(body);
      const childrenContext = childrenContextFromBody(body);
      const activityMode = resolveActivityMode(body);
      const activityStyle = resolveActivityStyle(
        body.activityStyle || body.activity_style,
        "imaginative"
      );
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
        activityStyle,
        childAges,
        activityMode,
        limit: 4,
      });

      // Fall back to curated presets when library is thin — age-aware.
      if (activities.length < 2) {
        const supabase = getSupabaseAdminClient();
        let presetQuery = supabase
          .from("preset_activities")
          .select("*")
          .eq("is_active", true)
          .eq("activity_style", activityStyle)
          .lte("estimated_minutes", minutes + 5)
          .order("display_order", { ascending: true })
          .limit(12);

        const { data: presets } = await presetQuery;

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
            age_min: row.age_min,
            age_max: row.age_max,
            target_ages: row.target_ages,
            maturity_level: row.maturity_level,
            age_fit_validated: row.age_fit_validated,
            ageFit: content.ageFit || {
              minAge: row.age_min,
              maxAge: row.age_max,
              targetAges: row.target_ages,
              maturityLevel: row.maturity_level,
            },
          };
        });

        const presetFiltered = filterActivitiesByAgePolicy(
          presetActivities,
          childrenContext,
          { activityMode, expectedStyle: activityStyle }
        );

        activities = [...activities, ...presetFiltered.activities].slice(0, 4);
      }

      activities = enrichActivitiesForServe(
        activities,
        activityStyle,
        childAges
      );

      const finalFiltered = filterActivitiesByAgePolicy(
        activities,
        childrenContext,
        { activityMode, expectedStyle: activityStyle }
      );
      activities = finalFiltered.activities;

      let momentId =
        typeof body.momentId === "string" && body.momentId.trim()
          ? body.momentId.trim()
          : null;

      if (!momentId) {
        const momentSnapshot = await createActivityMoment({
          userId: req.auth.userId,
          moment: currentMoment,
          kidMood: body.kidMood || null,
          childIds: Array.isArray(body.childIds)
            ? body.childIds
            : childrenContext.map((c) => c.id).filter(Boolean),
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
        generationContext: {
          participantAges: childAges,
          ageBands: childAges.map((age) => {
            if (age <= 5) return "young-child";
            if (age <= 7) return "early-elementary";
            if (age <= 9) return "elementary";
            if (age <= 11) return "older-elementary";
            if (age === 12) return "tween";
            if (age <= 14) return "young-teen";
            return "teen";
          }),
          activityMode,
          activityStyle,
          sourcePath: "rescue",
          agePolicyVersion: 2,
        },
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
      console.error("Shared activity outcome failed:", error);
      return res.status(500).json({
        error: "Could not record activity outcome.",
        code: "SHARED_OUTCOME_FAILED",
      });
    }
  }
);

export default router;
