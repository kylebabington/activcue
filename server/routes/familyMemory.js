// server/routes/familyMemory.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function formatSavedActivity(row) {
  return {
    id: row.id,
    activityData: row.activity_data,
    savedAt: row.saved_at,
  };
}

function formatActivityEvent(row) {
  return {
    id: row.id,
    childId: row.child_id,
    activityId: row.activity_id,
    activityTitle: row.activity_title,
    eventType: row.event_type,
    activityStyle: row.activity_style,
    energy: row.energy,
    mess: row.mess,
    adultHelp: row.adult_help,
    estimatedMinutes: row.estimated_minutes,
    uses: Array.isArray(row.uses) ? row.uses : [],
    context: isPlainObject(row.context) ? row.context : {},
    createdAt: row.created_at,
  };
}

function parseParticipantChildIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    ),
  ];
}

function parseSessionScope(value, participantChildIds = []) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "group" || normalized === "single") {
    return normalized;
  }

  return participantChildIds.length > 1 ? "group" : "single";
}

function parseCategories(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter(Boolean);
}

function parseTraits(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  return {
    ...(typeof value.setupEffort === "string"
      ? { setupEffort: value.setupEffort }
      : {}),
    ...(typeof value.structure === "string"
      ? { structure: value.structure }
      : {}),
    ...(typeof value.socialMode === "string"
      ? { socialMode: value.socialMode }
      : {}),
    ...(typeof value.creativity === "string"
      ? { creativity: value.creativity }
      : {}),
    ...(typeof value.movement === "string"
      ? { movement: value.movement }
      : {}),
  };
}

function formatParticipant(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    childId: row.child_id,
    engagementRating: row.engagement_rating,
    completionStatus: row.completion_status,
    rejectionReason: row.rejection_reason,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    createdAt: row.created_at,
  };
}

function formatActivitySession(row, participants = []) {
  const participantChildIds = parseParticipantChildIds(
    row.participant_child_ids
  );
  const resolvedParticipants = Array.isArray(participants)
    ? participants.map(formatParticipant)
    : [];

  // Prefer explicit participant rows; fall back to denormalized ids.
  const childIdsFromRows = resolvedParticipants
    .map((p) => p.childId)
    .filter(Boolean);
  const mergedParticipantIds =
    childIdsFromRows.length > 0 ? childIdsFromRows : participantChildIds;

  return {
    id: row.id,
    childId: row.child_id,
    sessionScope: parseSessionScope(row.session_scope, mergedParticipantIds),
    participantChildIds: mergedParticipantIds,
    participants: resolvedParticipants,
    activityTitle: row.activity_title,
    activityStyle: row.activity_style,
    requestedMinutes: row.requested_minutes,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    parentActivity: row.parent_activity,
    parentAvailability: row.parent_availability,
    space: row.space,
    noiseLimit: row.noise_limit,
    messLimit: row.mess_limit,
    supervisionLevel: row.supervision_level,
    activityEnergy: row.activity_energy,
    activityMess: row.activity_mess,
    activityAdultHelp: row.activity_adult_help,
    activitySupplies: Array.isArray(row.activity_supplies)
      ? row.activity_supplies
      : [],
    activityCategories: parseCategories(row.activity_categories),
    activityTraits: parseTraits(row.activity_traits),
    candidateId: row.candidate_id || null,
    recommendationBatchId: row.recommendation_batch_id || null,
    momentId: row.moment_id || null,
    presentedAt: row.presented_at || null,
    selectedAt: row.selected_at || null,
    rejectionReason: row.rejection_reason || null,
    actualMinutes: row.actual_minutes,
    completionStatus: row.completion_status,
    independenceRating: row.independence_rating,
    cleanupRating: row.cleanup_rating,
    createdAt: row.created_at,
  };
}

async function loadParticipantsForSessions(supabase, sessionIds) {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("activity_session_participants")
    .select("*")
    .in("session_id", sessionIds);

  if (error) {
    console.warn("Could not load session participants:", error);
    return new Map();
  }

  const bySession = new Map();
  for (const row of data || []) {
    const list = bySession.get(row.session_id) || [];
    list.push(row);
    bySession.set(row.session_id, list);
  }
  return bySession;
}

async function insertSessionParticipants(supabase, sessionId, childIds) {
  const uniqueIds = parseParticipantChildIds(childIds);
  if (!sessionId || uniqueIds.length === 0) {
    return [];
  }

  const rows = uniqueIds.map((childId) => ({
    session_id: sessionId,
    child_id: childId,
    joined_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("activity_session_participants")
    .upsert(rows, { onConflict: "session_id,child_id" })
    .select("*");

  if (error) {
    console.warn("Could not insert session participants:", error);
    return [];
  }

  return data || [];
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parseOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

/*
 * GET /api/family-memory/saved-activities
 */
router.get(
  "/family-memory/saved-activities",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const supabase = getSupabaseAdminClient();

      const { data, error } = await supabase
        .from("saved_activities")
        .select("*")
        .eq("user_id", req.auth.userId)
        .order("saved_at", { ascending: false });

      if (error) {
        console.error("Could not list saved activities:", error);
        return res.status(500).json({
          error: "Could not list saved activities.",
          code: "SAVED_ACTIVITIES_LIST_FAILED",
        });
      }

      return res.json({
        savedActivities: (data || []).map(formatSavedActivity),
      });
    } catch (error) {
      console.error("Unexpected saved activities list failure:", error);
      return res.status(500).json({
        error: "Could not list saved activities.",
        code: "SAVED_ACTIVITIES_LIST_FAILED",
      });
    }
  }
);

/*
 * POST /api/family-memory/saved-activities
 */
router.post(
  "/family-memory/saved-activities",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const activityData = req.body?.activityData ?? req.body?.activity_data;

      if (!isPlainObject(activityData)) {
        return res.status(400).json({
          error: "activityData must be a JSON object.",
          code: "SAVED_ACTIVITY_INVALID",
        });
      }

      const supabase = getSupabaseAdminClient();

      const { data, error } = await supabase
        .from("saved_activities")
        .insert({
          user_id: req.auth.userId,
          activity_data: activityData,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Could not save activity favorite:", error);
        return res.status(500).json({
          error: "Could not save activity favorite.",
          code: "SAVED_ACTIVITY_CREATE_FAILED",
        });
      }

      return res.status(201).json({
        savedActivity: formatSavedActivity(data),
      });
    } catch (error) {
      console.error("Unexpected saved activity create failure:", error);
      return res.status(500).json({
        error: "Could not save activity favorite.",
        code: "SAVED_ACTIVITY_CREATE_FAILED",
      });
    }
  }
);

/*
 * DELETE /api/family-memory/saved-activities/:id
 */
router.delete(
  "/family-memory/saved-activities/:id",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();

      if (!id) {
        return res.status(400).json({
          error: "Saved activity id is required.",
          code: "SAVED_ACTIVITY_ID_REQUIRED",
        });
      }

      const supabase = getSupabaseAdminClient();

      const { data, error } = await supabase
        .from("saved_activities")
        .delete()
        .eq("user_id", req.auth.userId)
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Could not delete saved activity:", error);
        return res.status(500).json({
          error: "Could not delete saved activity.",
          code: "SAVED_ACTIVITY_DELETE_FAILED",
        });
      }

      if (!data) {
        return res.status(404).json({
          error: "Saved activity not found.",
          code: "SAVED_ACTIVITY_NOT_FOUND",
        });
      }

      return res.json({ deleted: true, id: data.id });
    } catch (error) {
      console.error("Unexpected saved activity delete failure:", error);
      return res.status(500).json({
        error: "Could not delete saved activity.",
        code: "SAVED_ACTIVITY_DELETE_FAILED",
      });
    }
  }
);

/*
 * GET /api/family-memory/activity-events
 */
router.get(
  "/family-memory/activity-events",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const supabase = getSupabaseAdminClient();
      const childId =
        typeof req.query.childId === "string" ? req.query.childId : "";
      const limit = Math.min(
        Math.max(parseOptionalInt(req.query.limit) || 50, 1),
        200
      );

      let query = supabase
        .from("activity_events")
        .select("*")
        .eq("user_id", req.auth.userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (childId) {
        query = query.eq("child_id", childId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Could not list activity events:", error);
        return res.status(500).json({
          error: "Could not list activity events.",
          code: "ACTIVITY_EVENTS_LIST_FAILED",
        });
      }

      return res.json({
        activityEvents: (data || []).map(formatActivityEvent),
      });
    } catch (error) {
      console.error("Unexpected activity events list failure:", error);
      return res.status(500).json({
        error: "Could not list activity events.",
        code: "ACTIVITY_EVENTS_LIST_FAILED",
      });
    }
  }
);

/*
 * POST /api/family-memory/activity-events
 */
router.post(
  "/family-memory/activity-events",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const activityTitle = parseOptionalString(
        body.activityTitle ?? body.activity_title
      );
      const eventType = parseOptionalString(
        body.eventType ?? body.event_type
      );

      if (!activityTitle || !eventType) {
        return res.status(400).json({
          error: "activityTitle and eventType are required.",
          code: "ACTIVITY_EVENT_INVALID",
        });
      }

      const supabase = getSupabaseAdminClient();

      const { data, error } = await supabase
        .from("activity_events")
        .insert({
          user_id: req.auth.userId,
          child_id:
            typeof (body.childId ?? body.child_id) === "string"
              ? body.childId ?? body.child_id
              : "",
          activity_id: parseOptionalString(
            body.activityId ?? body.activity_id
          ),
          activity_title: activityTitle,
          event_type: eventType,
          activity_style: parseOptionalString(
            body.activityStyle ?? body.activity_style
          ),
          energy: parseOptionalString(body.energy),
          mess: parseOptionalString(body.mess),
          adult_help: parseOptionalString(
            body.adultHelp ?? body.adult_help
          ),
          estimated_minutes: parseOptionalInt(
            body.estimatedMinutes ?? body.estimated_minutes
          ),
          uses: Array.isArray(body.uses) ? body.uses : [],
          context: isPlainObject(body.context) ? body.context : {},
        })
        .select("*")
        .single();

      if (error) {
        console.error("Could not append activity event:", error);
        return res.status(500).json({
          error: "Could not append activity event.",
          code: "ACTIVITY_EVENT_CREATE_FAILED",
        });
      }

      return res.status(201).json({
        activityEvent: formatActivityEvent(data),
      });
    } catch (error) {
      console.error("Unexpected activity event create failure:", error);
      return res.status(500).json({
        error: "Could not append activity event.",
        code: "ACTIVITY_EVENT_CREATE_FAILED",
      });
    }
  }
);

/*
 * DELETE /api/family-memory/activity-events
 * Clears all activity event history for the authenticated user.
 */
router.delete(
  "/family-memory/activity-events",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const supabase = getSupabaseAdminClient();

      const { error } = await supabase
        .from("activity_events")
        .delete()
        .eq("user_id", req.auth.userId);

      if (error) {
        console.error("Could not clear activity events:", error);
        return res.status(500).json({
          error: "Could not clear activity history.",
          code: "ACTIVITY_EVENTS_DELETE_FAILED",
        });
      }

      return res.json({ deleted: true });
    } catch (error) {
      console.error("Unexpected activity events delete failure:", error);
      return res.status(500).json({
        error: "Could not clear activity history.",
        code: "ACTIVITY_EVENTS_DELETE_FAILED",
      });
    }
  }
);

/*
 * DELETE /api/family-data
 * Full family data reset for the authenticated user.
 * Keeps account identity and Stripe subscription rows.
 */
router.delete(
  "/family-data",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    const userId = req.auth.userId;

    try {
      const supabase = getSupabaseAdminClient();

      const deletions = await Promise.all([
        supabase.from("activity_sessions").delete().eq("user_id", userId),
        supabase.from("activity_events").delete().eq("user_id", userId),
        supabase.from("saved_activities").delete().eq("user_id", userId),
      ]);

      for (const result of deletions) {
        if (result.error) {
          console.error("Could not reset family memory tables:", result.error);
          return res.status(500).json({
            error: "Could not reset family data.",
            code: "FAMILY_DATA_RESET_FAILED",
          });
        }
      }

      const { error: settingsError } = await supabase
        .from("family_settings")
        .delete()
        .eq("user_id", userId);

      if (settingsError) {
        console.error("Could not reset family settings:", settingsError);
        return res.status(500).json({
          error: "Could not reset family data.",
          code: "FAMILY_DATA_RESET_FAILED",
        });
      }

      return res.json({
        reset: true,
        retained: ["account", "subscription"],
      });
    } catch (error) {
      console.error("Unexpected family data reset failure:", error);
      return res.status(500).json({
        error: "Could not reset family data.",
        code: "FAMILY_DATA_RESET_FAILED",
      });
    }
  }
);

/*
 * GET /api/family-memory/activity-sessions
 */
router.get(
  "/family-memory/activity-sessions",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const supabase = getSupabaseAdminClient();
      const childId =
        typeof req.query.childId === "string" ? req.query.childId : "";
      const limit = Math.min(
        Math.max(parseOptionalInt(req.query.limit) || 50, 1),
        200
      );

      let query = supabase
        .from("activity_sessions")
        .select("*")
        .eq("user_id", req.auth.userId)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (childId) {
        query = query.eq("child_id", childId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Could not list activity sessions:", error);
        return res.status(500).json({
          error: "Could not list activity sessions.",
          code: "ACTIVITY_SESSIONS_LIST_FAILED",
        });
      }

      const sessionRows = data || [];
      const participantsBySession = await loadParticipantsForSessions(
        supabase,
        sessionRows.map((row) => row.id)
      );

      return res.json({
        activitySessions: sessionRows.map((row) =>
          formatActivitySession(row, participantsBySession.get(row.id) || [])
        ),
      });
    } catch (error) {
      console.error("Unexpected activity sessions list failure:", error);
      return res.status(500).json({
        error: "Could not list activity sessions.",
        code: "ACTIVITY_SESSIONS_LIST_FAILED",
      });
    }
  }
);

/*
 * POST /api/family-memory/activity-sessions
 */
router.post(
  "/family-memory/activity-sessions",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const activityTitle = parseOptionalString(
        body.activityTitle ?? body.activity_title
      );

      if (!activityTitle) {
        return res.status(400).json({
          error: "activityTitle is required.",
          code: "ACTIVITY_SESSION_INVALID",
        });
      }

      const supabase = getSupabaseAdminClient();

      const participantChildIds = parseParticipantChildIds(
        body.participantChildIds ?? body.participant_child_ids
      );
      const sessionScope = parseSessionScope(
        body.sessionScope ?? body.session_scope,
        participantChildIds
      );

      const { data, error } = await supabase
        .from("activity_sessions")
        .insert({
          user_id: req.auth.userId,
          child_id:
            typeof (body.childId ?? body.child_id) === "string"
              ? body.childId ?? body.child_id
              : "",
          session_scope: sessionScope,
          participant_child_ids: participantChildIds,
          activity_title: activityTitle,
          activity_style: parseOptionalString(
            body.activityStyle ?? body.activity_style
          ),
          requested_minutes: parseOptionalInt(
            body.requestedMinutes ?? body.requested_minutes
          ),
          started_at:
            parseOptionalString(body.startedAt ?? body.started_at) ||
            new Date().toISOString(),
          finished_at: parseOptionalString(
            body.finishedAt ?? body.finished_at
          ),
          parent_activity: parseOptionalString(
            body.parentActivity ?? body.parent_activity
          ),
          parent_availability: parseOptionalString(
            body.parentAvailability ?? body.parent_availability
          ),
          space: parseOptionalString(body.space),
          noise_limit: parseOptionalString(
            body.noiseLimit ?? body.noise_limit
          ),
          mess_limit: parseOptionalString(
            body.messLimit ?? body.mess_limit
          ),
          supervision_level: parseOptionalString(
            body.supervisionLevel ?? body.supervision_level
          ),
          activity_energy: parseOptionalString(
            body.activityEnergy ?? body.activity_energy
          ),
          activity_mess: parseOptionalString(
            body.activityMess ?? body.activity_mess
          ),
          activity_adult_help: parseOptionalString(
            body.activityAdultHelp ?? body.activity_adult_help
          ),
          activity_supplies: Array.isArray(
            body.activitySupplies ?? body.activity_supplies
          )
            ? body.activitySupplies ?? body.activity_supplies
            : [],
          activity_categories: parseCategories(
            body.activityCategories ?? body.activity_categories
          ),
          activity_traits: parseTraits(
            body.activityTraits ?? body.activity_traits
          ),
          candidate_id: parseOptionalString(
            body.candidateId ?? body.candidate_id
          ),
          recommendation_batch_id: parseOptionalString(
            body.recommendationBatchId ?? body.recommendation_batch_id
          ),
          moment_id: parseOptionalString(body.momentId ?? body.moment_id),
          presented_at: parseOptionalString(
            body.presentedAt ?? body.presented_at
          ),
          selected_at: parseOptionalString(
            body.selectedAt ?? body.selected_at
          ),
          rejection_reason: parseOptionalString(
            body.rejectionReason ?? body.rejection_reason
          ),
          actual_minutes: parseOptionalInt(
            body.actualMinutes ?? body.actual_minutes
          ),
          completion_status: parseOptionalString(
            body.completionStatus ?? body.completion_status
          ),
          independence_rating: parseOptionalString(
            body.independenceRating ?? body.independence_rating
          ),
          cleanup_rating: parseOptionalString(
            body.cleanupRating ?? body.cleanup_rating
          ),
        })
        .select("*")
        .single();

      if (error) {
        console.error("Could not create activity session:", error);
        return res.status(500).json({
          error: "Could not create activity session.",
          code: "ACTIVITY_SESSION_CREATE_FAILED",
        });
      }

      const participants = await insertSessionParticipants(
        supabase,
        data.id,
        participantChildIds
      );

      return res.status(201).json({
        activitySession: formatActivitySession(data, participants),
      });
    } catch (error) {
      console.error("Unexpected activity session create failure:", error);
      return res.status(500).json({
        error: "Could not create activity session.",
        code: "ACTIVITY_SESSION_CREATE_FAILED",
      });
    }
  }
);

/*
 * PATCH /api/family-memory/activity-sessions/:id/participants/:childId
 */
router.patch(
  "/family-memory/activity-sessions/:id/participants/:childId",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const sessionId = String(req.params.id || "").trim();
      const childId = String(req.params.childId || "").trim();
      const body = isPlainObject(req.body) ? req.body : {};

      if (!sessionId || !childId) {
        return res.status(400).json({
          error: "session id and childId are required.",
          code: "ACTIVITY_SESSION_PARTICIPANT_INVALID",
        });
      }

      const supabase = getSupabaseAdminClient();

      const { data: session, error: sessionError } = await supabase
        .from("activity_sessions")
        .select("id")
        .eq("user_id", req.auth.userId)
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionError) {
        console.error("Could not verify activity session:", sessionError);
        return res.status(500).json({
          error: "Could not update participant.",
          code: "ACTIVITY_SESSION_PARTICIPANT_UPDATE_FAILED",
        });
      }

      if (!session) {
        return res.status(404).json({
          error: "Activity session not found.",
          code: "ACTIVITY_SESSION_NOT_FOUND",
        });
      }

      const patch = {
        child_id: childId,
        session_id: sessionId,
      };

      const engagementRating = parseOptionalString(
        body.engagementRating ?? body.engagement_rating
      );
      if (engagementRating) {
        patch.engagement_rating = engagementRating;
      }

      const completionStatus = parseOptionalString(
        body.completionStatus ?? body.completion_status
      );
      if (completionStatus) {
        patch.completion_status = completionStatus;
      }

      const rejectionReason = parseOptionalString(
        body.rejectionReason ?? body.rejection_reason
      );
      if (rejectionReason) {
        patch.rejection_reason = rejectionReason;
      }

      const leftAt = parseOptionalString(body.leftAt ?? body.left_at);
      if (leftAt) {
        patch.left_at = leftAt;
      } else if (completionStatus || rejectionReason) {
        patch.left_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("activity_session_participants")
        .upsert(patch, { onConflict: "session_id,child_id" })
        .select("*")
        .single();

      if (error) {
        console.error("Could not update session participant:", error);
        return res.status(500).json({
          error: "Could not update participant.",
          code: "ACTIVITY_SESSION_PARTICIPANT_UPDATE_FAILED",
        });
      }

      return res.json({
        participant: formatParticipant(data),
      });
    } catch (error) {
      console.error("Unexpected participant update failure:", error);
      return res.status(500).json({
        error: "Could not update participant.",
        code: "ACTIVITY_SESSION_PARTICIPANT_UPDATE_FAILED",
      });
    }
  }
);

/*
 * PATCH /api/family-memory/activity-sessions/:id
 */
router.patch(
  "/family-memory/activity-sessions/:id",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      const body = isPlainObject(req.body) ? req.body : {};

      if (!id) {
        return res.status(400).json({
          error: "Activity session id is required.",
          code: "ACTIVITY_SESSION_ID_REQUIRED",
        });
      }

      const patch = {};

      const finishedAt = parseOptionalString(
        body.finishedAt ?? body.finished_at
      );
      if (finishedAt) {
        patch.finished_at = finishedAt;
      }

      const actualMinutes = parseOptionalInt(
        body.actualMinutes ?? body.actual_minutes
      );
      if (actualMinutes !== null) {
        patch.actual_minutes = actualMinutes;
      }

      const completionStatus = parseOptionalString(
        body.completionStatus ?? body.completion_status
      );
      if (completionStatus) {
        patch.completion_status = completionStatus;
      }

      const independenceRating = parseOptionalString(
        body.independenceRating ?? body.independence_rating
      );
      if (independenceRating) {
        patch.independence_rating = independenceRating;
      }

      const cleanupRating = parseOptionalString(
        body.cleanupRating ?? body.cleanup_rating
      );
      if (cleanupRating) {
        patch.cleanup_rating = cleanupRating;
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({
          error: "No updatable fields provided.",
          code: "ACTIVITY_SESSION_PATCH_EMPTY",
        });
      }

      const supabase = getSupabaseAdminClient();

      const { data, error } = await supabase
        .from("activity_sessions")
        .update(patch)
        .eq("user_id", req.auth.userId)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Could not update activity session:", error);
        return res.status(500).json({
          error: "Could not update activity session.",
          code: "ACTIVITY_SESSION_UPDATE_FAILED",
        });
      }

      if (!data) {
        return res.status(404).json({
          error: "Activity session not found.",
          code: "ACTIVITY_SESSION_NOT_FOUND",
        });
      }

      return res.json({
        activitySession: formatActivitySession(data),
      });
    } catch (error) {
      console.error("Unexpected activity session update failure:", error);
      return res.status(500).json({
        error: "Could not update activity session.",
        code: "ACTIVITY_SESSION_UPDATE_FAILED",
      });
    }
  }
);

export default router;
