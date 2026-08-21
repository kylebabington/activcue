// server/lib/recommendationTelemetry.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";
import { getHouseholdIdForUser } from "./households.js";
import {
  createCandidateId,
  createRecommendationBatchId,
} from "./recommendationIds.js";

const BATCH_SOURCES = new Set([
  "openai",
  "shared_library",
  "current_batch",
  "curated",
  "templates",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function parseOptionalInt(value) {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseChildIds(value) {
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
    ...(typeof value.structure === "string" ? { structure: value.structure } : {}),
    ...(typeof value.socialMode === "string"
      ? { socialMode: value.socialMode }
      : {}),
    ...(typeof value.creativity === "string"
      ? { creativity: value.creativity }
      : {}),
    ...(typeof value.movement === "string" ? { movement: value.movement } : {}),
  };
}

function normalizeBatchSource(source) {
  const normalized = String(source || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (BATCH_SOURCES.has(normalized)) {
    return normalized;
  }
  if (normalized === "sharedlibrary" || normalized === "library") {
    return "shared_library";
  }
  if (normalized === "preset" || normalized === "presets") {
    return "curated";
  }
  if (normalized === "ai" || normalized === "openai") {
    return "openai";
  }
  return "templates";
}

function normalizeMode(mode) {
  return String(mode || "").trim().toLowerCase() === "rescue"
    ? "rescue"
    : "normal";
}

export function formatActivityMoment(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    householdId: row.household_id || null,
    availableMinutes: row.available_minutes,
    parentActivity: row.parent_activity,
    availability: row.availability,
    space: row.space,
    messLevel: row.mess_level,
    noiseLevel: row.noise_level,
    supervisionLevel: row.supervision_level,
    childIds: Array.isArray(row.child_ids) ? row.child_ids : [],
    childCount: row.child_count || 0,
    kidMood: row.kid_mood || null,
    rescueMode: Boolean(row.rescue_mode),
    createdAt: row.created_at,
  };
}

/**
 * Persist an immutable parent-moment snapshot.
 */
export async function createActivityMoment({
  userId,
  moment = {},
  childIds = [],
  kidMood = null,
  rescueMode = false,
  householdId = null,
} = {}) {
  if (!userId) {
    return null;
  }

  const resolvedChildIds = parseChildIds(childIds);
  const resolvedHouseholdId =
    householdId || (await getHouseholdIdForUser(userId));

  const momentInput = isPlainObject(moment) ? moment : {};
  const row = {
    user_id: userId,
    household_id: resolvedHouseholdId,
    available_minutes: parseOptionalInt(
      momentInput.timeNeededMinutes ??
        momentInput.availableMinutes ??
        momentInput.available_minutes
    ),
    parent_activity: parseOptionalString(
      momentInput.parentActivity ?? momentInput.parent_activity
    ),
    availability: parseOptionalString(momentInput.availability),
    space: parseOptionalString(momentInput.space),
    mess_level: parseOptionalString(
      momentInput.messLevel ?? momentInput.mess_level
    ),
    noise_level: parseOptionalString(
      momentInput.noiseLevel ?? momentInput.noise_level
    ),
    supervision_level: parseOptionalString(
      momentInput.supervisionLevel ?? momentInput.supervision_level
    ),
    child_ids: resolvedChildIds,
    child_count: resolvedChildIds.length,
    kid_mood: parseOptionalString(kidMood ?? momentInput.kidMood),
    rescue_mode: Boolean(rescueMode),
  };

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("activity_moments")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.warn("Could not create activity moment:", error);
      return null;
    }

    return formatActivityMoment(data);
  } catch (error) {
    console.warn("Could not create activity moment:", error);
    return null;
  }
}

/**
 * Persist a recommendation batch + per-candidate impression rows.
 * Returns { recommendationBatchId, candidates } with activities enriched.
 */
export async function createRecommendationBatch({
  userId,
  momentId = null,
  source = "templates",
  mode = "normal",
  model = null,
  latencyMs = null,
  householdId = null,
  activities = [],
  batchId = null,
  generationContext = null,
} = {}) {
  if (!userId || !Array.isArray(activities) || activities.length === 0) {
    return {
      recommendationBatchId: batchId || null,
      activities,
      candidates: [],
    };
  }

  const resolvedHouseholdId =
    householdId || (await getHouseholdIdForUser(userId));
  const recommendationBatchId = batchId || createRecommendationBatchId();
  const presentedAt = new Date().toISOString();
  const batchSource = normalizeBatchSource(source);
  const batchMode = normalizeMode(mode);

  const candidateRows = activities.map((activity, index) => {
    // Impression PK must always be fresh — never the shared library UUID.
    const candidateId = createCandidateId();

    const explicitSharedId = parseOptionalString(
      activity?.sharedCandidateId ?? activity?.shared_candidate_id
    );
    // Only link to shared_activity_candidates when we have an explicit library id.
    // Do not fall back to candidateId (that conflation caused pkey collisions).
    const sharedCandidateId = explicitSharedId || null;

    const fitScoreRaw =
      activity?.fitScore ?? activity?.fit_score ?? activity?.totalScore;
    const fitScore =
      fitScoreRaw == null || fitScoreRaw === ""
        ? null
        : Number.isFinite(Number(fitScoreRaw))
          ? Math.round(Number(fitScoreRaw) * 1000) / 1000
          : null;

    return {
      id: candidateId,
      recommendation_batch_id: recommendationBatchId,
      shared_candidate_id: sharedCandidateId,
      position: index,
      fit_score: fitScore,
      source: parseOptionalString(activity?.source) || batchSource,
      title: parseOptionalString(activity?.title),
      categories: parseCategories(activity?.categories),
      traits: parseTraits(activity?.traits),
      presented_at:
        parseOptionalString(activity?.presentedAt ?? activity?.presented_at) ||
        presentedAt,
    };
  });

  try {
    const supabase = getSupabaseAdminClient();
    const { error: batchError } = await supabase
      .from("recommendation_batches")
      .insert({
        id: recommendationBatchId,
        user_id: userId,
        household_id: resolvedHouseholdId,
        moment_id: parseOptionalString(momentId),
        source: batchSource,
        mode: batchMode,
        model: parseOptionalString(model),
        latency_ms: parseOptionalInt(latencyMs),
        generation_context: isPlainObject(generationContext)
          ? generationContext
          : {},
      });

    if (batchError) {
      console.warn("Could not create recommendation batch:", batchError);
      return {
        recommendationBatchId,
        activities: activities.map((activity, index) => ({
          ...activity,
          recommendationBatchId,
          candidateId: candidateRows[index].id,
          presentedAt: candidateRows[index].presented_at,
          momentId: momentId || null,
        })),
        candidates: [],
      };
    }

    const { data: insertedCandidates, error: candidatesError } = await supabase
      .from("recommendation_candidates")
      .insert(candidateRows)
      .select("*");

    if (candidatesError) {
      console.warn(
        "Could not create recommendation candidates:",
        candidatesError
      );
    }

    const enriched = activities.map((activity, index) => ({
      ...activity,
      recommendationBatchId,
      candidateId: candidateRows[index].id,
      presentedAt: candidateRows[index].presented_at,
      momentId: momentId || null,
      sharedCandidateId: candidateRows[index].shared_candidate_id,
    }));

    return {
      recommendationBatchId,
      activities: enriched,
      candidates: insertedCandidates || candidateRows,
      momentId: momentId || null,
    };
  } catch (error) {
    console.warn("Could not create recommendation batch:", error);
    return {
      recommendationBatchId,
      activities: activities.map((activity, index) => ({
        ...activity,
        recommendationBatchId,
        candidateId: candidateRows[index]?.id || createCandidateId(),
        momentId: momentId || null,
      })),
      candidates: [],
      momentId: momentId || null,
    };
  }
}
