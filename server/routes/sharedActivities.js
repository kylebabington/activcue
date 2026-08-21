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
  filterActivitiesByFitPolicy,
  buildFitRequestContextFromParts,
} from "../utils/activityFitPolicy.js";
import { enrichActivitiesForServe } from "../utils/enrichActivityForServe.js";
import { resolveActivityStyle } from "../utils/normalizeRequest.js";
import { resolveParticipantContext } from "../utils/participantContext.js";
import { buildSanitizedGenerationContext } from "../utils/sanitizedGenerationContext.js";

const router = Router();

router.use(familyDataRateLimiter);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function buildFitContext(body, participants, moment, activityStyle) {
  if (isPlainObject(body.requestContext)) {
    return {
      ...body.requestContext,
      participants: {
        ...(body.requestContext.participants || {}),
        mode: participants.mode,
        participantCount: participants.participantCount,
        children: participants.children,
        childrenContext: participants.childrenContext,
        ages: participants.ages,
      },
      moment: {
        ...(body.requestContext.moment || {}),
        ...moment,
      },
      activity: {
        ...(body.requestContext.activity || {}),
        style: activityStyle,
      },
      inventory: Array.isArray(body.requestContext.inventory)
        ? body.requestContext.inventory
        : Array.isArray(body.inventory)
          ? body.inventory
          : [],
      safety: {
        ...(body.requestContext.safety || {}),
        ...(isPlainObject(body.safetySettings) ? body.safetySettings : {}),
        maxActivityMinutes:
          Number(moment.timeNeededMinutes) ||
          Number(body.requestContext?.safety?.maxActivityMinutes) ||
          30,
        quietMode:
          body.requestContext?.safety?.quietMode === true ||
          moment.noiseLevel === "quiet",
      },
    };
  }

  return buildFitRequestContextFromParts({
    participants: {
      mode: participants.mode,
      participantCount: participants.participantCount,
      children: participants.children,
      childrenContext: participants.childrenContext,
      ages: participants.ages,
    },
    moment,
    safety: {
      ...(isPlainObject(body.safetySettings) ? body.safetySettings : {}),
      maxActivityMinutes: Number(moment.timeNeededMinutes) || 30,
      quietMode: moment.noiseLevel === "quiet",
    },
    activity: { style: activityStyle },
    inventory: Array.isArray(body.inventory) ? body.inventory : [],
  });
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
      const participants = resolveParticipantContext(body);
      if (!participants.ok) {
        return res.status(400).json({
          error: participants.error,
          code: participants.code,
        });
      }

      const activityStyle = resolveActivityStyle(
        body.requestContext?.activity?.style ||
          body.activityStyle ||
          body.activity_style,
        "imaginative"
      );
      const currentMoment = isPlainObject(body.requestContext?.moment)
        ? body.requestContext.moment
        : isPlainObject(body.currentMoment)
          ? body.currentMoment
          : {};
      const fitContext = buildFitContext(
        body,
        participants,
        currentMoment,
        activityStyle
      );

      const candidates = await querySharedCandidatesForUser({
        userId: req.auth.userId,
        inventory: fitContext.inventory,
        currentMoment,
        excludeCandidateIds: Array.isArray(body.excludeCandidateIds)
          ? body.excludeCandidateIds
          : [],
        excludeCategories: Array.isArray(body.excludeCategories)
          ? body.excludeCategories
          : [],
        activityStyle,
        childAges: participants.ages,
        activityMode: participants.mode,
        requestContext: fitContext,
        safetySettings: fitContext.safety,
        limit: Math.min(Math.max(Number(body.limit) || 3, 1), 10),
      });

      const enrichedCandidates = enrichActivitiesForServe(
        candidates,
        activityStyle,
        participants.ages
      );

      const policyFiltered = filterActivitiesByFitPolicy(
        enrichedCandidates,
        fitContext
      );

      let momentId =
        typeof body.momentId === "string" && body.momentId.trim()
          ? body.momentId.trim()
          : null;

      if (!momentId && isPlainObject(currentMoment)) {
        const momentSnapshot = await createActivityMoment({
          userId: req.auth.userId,
          moment: currentMoment,
          kidMood:
            body.requestContext?.activity?.energyLevel || body.kidMood || null,
          childIds: participants.children.map((c) => c.id).filter(Boolean),
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
        generationContext: buildSanitizedGenerationContext({
          requestContext: fitContext,
          participants,
          activityStyle,
          sourcePath: "plan-b",
          requestId: fitContext.requestId,
          extra: { rejectSummary: policyFiltered.summary.rejectedByReason },
        }),
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
      const participants = resolveParticipantContext(body);
      if (!participants.ok) {
        return res.status(400).json({
          error: participants.error,
          code: participants.code,
        });
      }

      const minutes = Number(body.minutes) ||
        Number(body.requestContext?.moment?.timeNeededMinutes) ||
        20;
      const activityStyle = resolveActivityStyle(
        body.requestContext?.activity?.style ||
          body.activityStyle ||
          body.activity_style,
        "imaginative"
      );
      const currentMoment = {
        ...(isPlainObject(body.requestContext?.moment)
          ? body.requestContext.moment
          : isPlainObject(body.currentMoment)
            ? body.currentMoment
            : {}),
        timeNeededMinutes: minutes,
        messLevel: "low",
        noiseLevel: "quiet",
        supervisionLevel: "independent",
        availability:
          body.currentMoment?.availability ||
          body.requestContext?.moment?.availability ||
          "do-not-interrupt",
      };

      const baseContext = buildFitContext(
        body,
        participants,
        currentMoment,
        activityStyle
      );
      const fitContext = {
        ...baseContext,
        moment: currentMoment,
        safety: {
          ...(baseContext.safety || {}),
          maxActivityMinutes: minutes,
          quietMode: true,
          adultHelpAllowed: "independent",
        },
        // Rescue overlays intentional moment constraints but keeps participants/style/safety flags.
        participants: baseContext.participants,
        activity: baseContext.activity,
      };

      let activities = await querySharedCandidatesForUser({
        userId: req.auth.userId,
        inventory: fitContext.inventory,
        currentMoment,
        excludeCandidateIds: Array.isArray(body.excludeCandidateIds)
          ? body.excludeCandidateIds
          : [],
        activityStyle,
        childAges: participants.ages,
        activityMode: participants.mode,
        requestContext: fitContext,
        safetySettings: fitContext.safety,
        limit: 4,
      });

      if (activities.length < 2) {
        const supabase = getSupabaseAdminClient();
        const { data: presets } = await supabase
          .from("preset_activities")
          .select("*")
          .eq("is_active", true)
          .eq("activity_style", activityStyle)
          .lte("estimated_minutes", minutes)
          .order("display_order", { ascending: true })
          .limit(12);

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
            participant_mode: row.participant_mode,
            participant_min: row.participant_min,
            participant_max: row.participant_max,
            ageFit: content.ageFit || {
              minAge: row.age_min,
              maxAge: row.age_max,
              targetAges: row.target_ages,
              maturityLevel: row.maturity_level,
            },
          };
        });

        const presetFiltered = filterActivitiesByFitPolicy(
          presetActivities,
          fitContext
        );
        activities = [...activities, ...presetFiltered.activities].slice(0, 4);
      }

      activities = enrichActivitiesForServe(
        activities,
        activityStyle,
        participants.ages
      );

      const finalFiltered = filterActivitiesByFitPolicy(activities, fitContext);
      activities = finalFiltered.activities;

      let momentId =
        typeof body.momentId === "string" && body.momentId.trim()
          ? body.momentId.trim()
          : null;

      if (!momentId) {
        const momentSnapshot = await createActivityMoment({
          userId: req.auth.userId,
          moment: currentMoment,
          kidMood:
            body.requestContext?.activity?.energyLevel || body.kidMood || null,
          childIds: participants.children.map((c) => c.id).filter(Boolean),
          rescueMode: true,
        });
        momentId = momentSnapshot?.id || null;
      }

      const withIds = attachRecommendationIds(activities);
      const batch = await createRecommendationBatch({
        userId: req.auth.userId,
        momentId,
        source: "shared_library",
        mode: "rescue",
        activities: withIds.activities,
        batchId: withIds.recommendationBatchId,
        generationContext: buildSanitizedGenerationContext({
          requestContext: fitContext,
          participants,
          activityStyle,
          sourcePath: "rescue",
          requestId: fitContext.requestId,
          extra: { rejectSummary: finalFiltered.summary.rejectedByReason },
        }),
      });

      return res.json({
        source: "rescue",
        recommendationBatchId: batch.recommendationBatchId,
        momentId,
        activities: batch.activities,
      });
    } catch (error) {
      console.error("Rescue library lookup failed:", error);
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
        error: "Could not record outcome.",
        code: "OUTCOME_FAILED",
      });
    }
  }
);

export default router;
