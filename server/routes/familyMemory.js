// server/routes/familyMemory.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";

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

function formatActivitySession(row) {
  return {
    id: row.id,
    childId: row.child_id,
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
    actualMinutes: row.actual_minutes,
    completionStatus: row.completion_status,
    independenceRating: row.independence_rating,
    cleanupRating: row.cleanup_rating,
    createdAt: row.created_at,
  };
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
 * GET /api/family-memory/activity-sessions
 */
router.get(
  "/family-memory/activity-sessions",
  requireAuthenticatedUser,
  ensureUserProfile,
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

      return res.json({
        activitySessions: (data || []).map(formatActivitySession),
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

      const { data, error } = await supabase
        .from("activity_sessions")
        .insert({
          user_id: req.auth.userId,
          child_id:
            typeof (body.childId ?? body.child_id) === "string"
              ? body.childId ?? body.child_id
              : "",
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

      return res.status(201).json({
        activitySession: formatActivitySession(data),
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
 * PATCH /api/family-memory/activity-sessions/:id
 */
router.patch(
  "/family-memory/activity-sessions/:id",
  requireAuthenticatedUser,
  ensureUserProfile,
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
