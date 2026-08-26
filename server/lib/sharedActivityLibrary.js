// server/lib/sharedActivityLibrary.js

import { createHash } from "crypto";
import { getSupabaseAdminClient } from "./supabaseAdminClient.js";
import {
  AGE_POLICY_VERSION,
  evaluateActivityAgeFit,
  resolveAgeFit,
  scoreActivityAgeMatch,
} from "../utils/activityAgePolicy.js";
import { sanitizeForSharedLibrary } from "../utils/sanitizeForSharedLibrary.js";
import { validateActivityForDisplay } from "../utils/activityDisplayValidation.js";
import {
  inferParticipantMetadata,
  evaluateActivityFit,
  buildFitRequestContextFromParts,
} from "../utils/activityFitPolicy.js";
import {
  isImpressionSuppressed,
  selectFreshFirstCandidates,
} from "../utils/suggestionFill.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Prefer validated age metadata. Enabled after display/age content audit gates.
 */
export const REQUIRE_VALIDATED_AGE_FIT = true;

/**
 * Days since an ISO timestamp. Missing/invalid → Infinity (no recency hit).
 */
export function daysSinceTimestamp(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, (now - t) / MS_PER_DAY);
}

/**
 * Soft ranking penalties from per-user impression history.
 * Shown / started / completed are never hard bans — only "Not this" is.
 * Heavily shown items still lose hard to fresh ones via fresh-first selection.
 */
export function impressionRankingPenalty(impression, now = Date.now()) {
  if (!impression) {
    return 0;
  }

  const timesShown = Number(impression.times_shown) || 0;
  // Prefer fresher ideas: grows with times_shown (capped so scores stay usable).
  let penalty = Math.min(25, timesShown * 2);

  const days = daysSinceTimestamp(
    impression.last_seen_at || impression.first_seen_at,
    now
  );

  // Shown-only recency cooldown (even without start/complete).
  if (timesShown > 0) {
    if (days < 7) penalty += 15;
    else if (days < 21) penalty += 8;
    else if (days < 60) penalty += 3;
  }

  // Started (and completed-as-engagement) → stronger temporary cooldown.
  if ((Number(impression.times_started) || 0) > 0) {
    if (days < 7) penalty += 12;
    else if (days < 21) penalty += 8;
    else if (days < 60) penalty += 4;
    else if (days < 120) penalty += 2;
    else penalty += 1;
  }

  return penalty;
}

/**
 * Hard age-range gate for library rows (same bar as style / time / mess).
 * When childAges is empty, skip (callers should pass ages).
 * Prefers DB age columns; falls back to activity_data.ageFit.
 */
export function candidatePassesAgeRange(
  row,
  childAges = [],
  { requireValidated = REQUIRE_VALIDATED_AGE_FIT, activityMode = "single-child" } = {}
) {
  const ages = (Array.isArray(childAges) ? childAges : [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age));

  if (ages.length === 0) {
    return true;
  }

  if (requireValidated && row?.age_fit_validated !== true) {
    return false;
  }

  const minAge = Number(
    row?.age_min ?? row?.activity_data?.ageFit?.minAge ?? row?.ageFit?.minAge
  );
  const maxAge = Number(
    row?.age_max ?? row?.activity_data?.ageFit?.maxAge ?? row?.ageFit?.maxAge
  );

  if (Number.isFinite(minAge) && Number.isFinite(maxAge)) {
    if (!ages.every((age) => age >= minAge && age <= maxAge)) {
      return false;
    }
  } else {
    const ageFit = resolveAgeFit(
      row?.activity_data && typeof row.activity_data === "object"
        ? row.activity_data
        : row
    );
    if (!ageFit || !Number.isFinite(ageFit.minAge) || !Number.isFinite(ageFit.maxAge)) {
      return false;
    }
    if (!ages.every((age) => age >= ageFit.minAge && age <= ageFit.maxAge)) {
      return false;
    }
  }

  const activity = formatCandidateForPolicy(row);
  const evaluation = evaluateActivityAgeFit({
    activity,
    childrenContext: ages,
    activityMode,
    requireValidated: false,
  });
  return evaluation.eligible;
}

function formatCandidateForPolicy(row) {
  const data =
    row?.activity_data && typeof row.activity_data === "object"
      ? row.activity_data
      : row && typeof row === "object"
        ? row
        : {};
  return {
    ...data,
    age_min: row?.age_min,
    age_max: row?.age_max,
    target_ages: row?.target_ages,
    maturity_level: row?.maturity_level,
    age_fit_validated: row?.age_fit_validated,
    ageFit: data.ageFit || {
      minAge: row?.age_min,
      maxAge: row?.age_max,
      targetAges: row?.target_ages,
      maturityLevel: row?.maturity_level,
    },
  };
}

function ageMetadataFromActivity(activity, { validated = false } = {}) {
  const ageFit = resolveAgeFit(activity) || {};
  return {
    age_min: Number.isFinite(ageFit.minAge) ? ageFit.minAge : null,
    age_max: Number.isFinite(ageFit.maxAge) ? ageFit.maxAge : null,
    target_ages: Array.isArray(ageFit.targetAges) ? ageFit.targetAges : null,
    maturity_level: ageFit.maturityLevel || null,
    age_fit_version: validated ? AGE_POLICY_VERSION : 1,
    age_fit_validated: Boolean(validated),
    age_fit_reviewed_at: validated ? new Date().toISOString() : null,
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeActivityContentHash(activity) {
  const payload = {
    title: activity?.title || "",
    activityStyle: activity?.activityStyle || "",
    steps: Array.isArray(activity?.steps) ? activity.steps : [],
    uses: Array.isArray(activity?.uses) ? activity.uses : [],
    categories: Array.isArray(activity?.categories) ? activity.categories : [],
    traits: activity?.traits || {},
    energy: activity?.energy || "",
    mess: activity?.mess || "",
    adultHelp: activity?.adultHelp || "",
  };
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function toLibraryRow(activity, { source = "ai", ageValidated = false } = {}) {
  const safe = sanitizeForSharedLibrary(activity);
  const contentHash = computeActivityContentHash(safe);
  const ageMeta = ageMetadataFromActivity(safe, { validated: ageValidated });
  const participantMeta = inferParticipantMetadata(safe);
  const display = validateActivityForDisplay(safe, { mode: "cached" });
  const now = new Date().toISOString();

  return {
    // Never reuse a recommendation impression UUID as the library PK.
    content_hash: contentHash,
    activity_data: safe,
    activity_style: safe.activityStyle || null,
    categories: Array.isArray(safe.categories) ? safe.categories : [],
    traits: safe.traits && typeof safe.traits === "object" ? safe.traits : {},
    energy: safe.energy || null,
    mess: safe.mess || null,
    adult_help: safe.adultHelp || null,
    estimated_minutes: Number(safe.estimatedMinutes) || null,
    supplies: Array.isArray(safe.uses) ? safe.uses : [],
    source,
    is_active: display.valid,
    updated_at: now,
    display_validated: display.valid,
    display_validation_status: display.valid ? "valid" : "invalid",
    display_validation_errors: display.errors,
    display_validated_at: now,
    activity_format_version: Number(safe.activityFormatVersion) || null,
    ...ageMeta,
    ...participantMeta,
  };
}

async function quarantineInvalidCandidate(supabase, rowId, errors) {
  if (!supabase || !rowId) return;
  try {
    const now = new Date().toISOString();
    await supabase
      .from("shared_activity_candidates")
      .update({
        is_active: false,
        display_validated: false,
        display_validation_status: "invalid",
        display_validation_errors: errors,
        display_validated_at: now,
        updated_at: now,
      })
      .eq("id", rowId);
  } catch (error) {
    console.warn("[display:quarantine] failed", { rowId, error });
  }
}

export function formatSharedCandidate(row) {
  if (!row) {
    return null;
  }

  const data =
    row.activity_data && typeof row.activity_data === "object"
      ? row.activity_data
      : {};

  return {
    ...data,
    candidateId: row.id,
    sharedCandidateId: row.id,
    contentHash: row.content_hash,
    categories: Array.isArray(row.categories) ? row.categories : data.categories || [],
    traits: row.traits && typeof row.traits === "object" ? row.traits : data.traits || {},
    source: row.source,
    timesServed: row.times_served,
    timesStarted: row.times_started,
    timesCompleted: row.times_completed,
    timesRejected: row.times_rejected,
    age_min: row.age_min,
    age_max: row.age_max,
    target_ages: row.target_ages,
    maturity_level: row.maturity_level,
    age_fit_validated: row.age_fit_validated,
    ageFitValidated: row.age_fit_validated,
    display_validated: row.display_validated,
    displayValidated: row.display_validated,
    participant_mode: row.participant_mode,
    participant_min: row.participant_min,
    participant_max: row.participant_max,
    participantMode: row.participant_mode,
    participantMin: row.participant_min,
    participantMax: row.participant_max,
  };
}

/*
 * Upsert AI activities into the shared library and record impressions.
 * Reuses existing ids when content_hash already exists.
 */
export async function ingestGeneratedActivities({
  userId,
  activities = [],
  source = "ai",
  childrenContext = [],
  activityMode = "single-child",
} = {}) {
  if (!userId || !Array.isArray(activities) || activities.length === 0) {
    return activities;
  }

  const supabase = getSupabaseAdminClient();
  const resolved = [];

  for (const activity of activities) {
    const ages =
      Array.isArray(childrenContext) && childrenContext.length > 0
        ? childrenContext
        : [];
    const evaluation =
      ages.length > 0
        ? evaluateActivityAgeFit({
            activity,
            childrenContext: ages,
            activityMode,
          })
        : { eligible: true };

    if (!evaluation.eligible) {
      console.warn("[ageFit:ingest] skipping ineligible activity", {
        title: activity?.title,
        reasons: evaluation.reasons,
      });
      resolved.push(activity);
      continue;
    }

    const displayCheck = validateActivityForDisplay(
      sanitizeForSharedLibrary(activity),
      { mode: "cached" }
    );
    if (!displayCheck.valid) {
      console.warn("[display:ingest] skipping activity that is not display-ready", {
        title: activity?.title,
        errors: displayCheck.errors,
      });
      resolved.push(activity);
      continue;
    }

    const row = toLibraryRow(activity, {
      source,
      ageValidated: true,
    });

    const { data: existing } = await supabase
      .from("shared_activity_candidates")
      .select("*")
      .eq("content_hash", row.content_hash)
      .maybeSingle();

    let saved = existing;

    if (existing) {
      await supabase
        .from("shared_activity_candidates")
        .update({
          times_served: (existing.times_served || 0) + 1,
          age_min: row.age_min,
          age_max: row.age_max,
          target_ages: row.target_ages,
          maturity_level: row.maturity_level,
          age_fit_version: row.age_fit_version,
          age_fit_validated: row.age_fit_validated,
          age_fit_reviewed_at: row.age_fit_reviewed_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      saved = { ...existing, times_served: (existing.times_served || 0) + 1 };
    } else {
      const insertRow = {
        ...row,
        times_served: 1,
      };
      const { data: inserted, error } = await supabase
        .from("shared_activity_candidates")
        .insert(insertRow)
        .select("*")
        .single();

      if (error) {
        // Race on unique hash — fetch existing
        const { data: raced } = await supabase
          .from("shared_activity_candidates")
          .select("*")
          .eq("content_hash", row.content_hash)
          .maybeSingle();
        saved = raced;
      } else {
        saved = inserted;
      }
    }

    if (!saved) {
      resolved.push(activity);
      continue;
    }

    const now = new Date().toISOString();
    const { data: impression } = await supabase
      .from("user_candidate_impressions")
      .select("*")
      .eq("user_id", userId)
      .eq("candidate_id", saved.id)
      .maybeSingle();

    if (impression) {
      await supabase
        .from("user_candidate_impressions")
        .update({
          last_seen_at: now,
          times_shown: (impression.times_shown || 0) + 1,
        })
        .eq("id", impression.id);
    } else {
      await supabase.from("user_candidate_impressions").insert({
        user_id: userId,
        candidate_id: saved.id,
        first_seen_at: now,
        last_seen_at: now,
        times_shown: 1,
      });
    }

    resolved.push({
      ...activity,
      ...formatSharedCandidate(saved),
      recommendationBatchId: activity.recommendationBatchId,
      presentedAt: activity.presentedAt,
    });
  }

  return resolved;
}

/**
 * Upsert curated presets into the shared library without user impressions.
 * Idempotent on content_hash. Use source "preset-import".
 */
export async function ingestPresetCandidates({
  activities = [],
  source = "preset-import",
} = {}) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0, candidates: [] };
  }

  const supabase = getSupabaseAdminClient();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const candidates = [];

  for (const activity of activities) {
    const displayCheck = validateActivityForDisplay(
      sanitizeForSharedLibrary(activity),
      { mode: "cached" }
    );
    if (!displayCheck.valid) {
      console.warn("[display:preset-ingest] skipping incomplete preset", {
        title: activity?.title,
        errors: displayCheck.errors,
      });
      skipped += 1;
      continue;
    }

    const row = toLibraryRow(activity, { source, ageValidated: true });
    const { data: existing } = await supabase
      .from("shared_activity_candidates")
      .select("*")
      .eq("content_hash", row.content_hash)
      .maybeSingle();

    if (existing) {
      const { data: saved, error } = await supabase
        .from("shared_activity_candidates")
        .update({
          activity_data: row.activity_data,
          activity_style: row.activity_style,
          categories: row.categories,
          traits: row.traits,
          energy: row.energy,
          mess: row.mess,
          adult_help: row.adult_help,
          estimated_minutes: row.estimated_minutes,
          supplies: row.supplies,
          source: row.source,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error || !saved) {
        skipped += 1;
        continue;
      }
      updated += 1;
      candidates.push(formatSharedCandidate(saved));
      continue;
    }

    const { data: insertedRow, error } = await supabase
      .from("shared_activity_candidates")
      .insert({
        ...row,
        times_served: 0,
        times_started: 0,
        times_completed: 0,
        times_rejected: 0,
      })
      .select("*")
      .single();

    if (error) {
      const { data: raced } = await supabase
        .from("shared_activity_candidates")
        .select("*")
        .eq("content_hash", row.content_hash)
        .maybeSingle();
      if (raced) {
        updated += 1;
        candidates.push(formatSharedCandidate(raced));
      } else {
        skipped += 1;
      }
      continue;
    }

    inserted += 1;
    candidates.push(formatSharedCandidate(insertedRow));
  }

  return { inserted, updated, skipped, candidates };
}

function inventoryOverlapScore(supplies, inventory) {
  const inventoryText = (Array.isArray(inventory) ? inventory : [])
    .map((item) =>
      typeof item === "string"
        ? item.toLowerCase()
        : String(item?.name || item?.title || "").toLowerCase()
    )
    .filter(Boolean);

  if (inventoryText.length === 0) {
    return 0.5;
  }

  const needed = (Array.isArray(supplies) ? supplies : []).map((s) =>
    String(s || "").toLowerCase()
  );
  if (needed.length === 0) {
    return 1;
  }

  let hits = 0;
  for (const supply of needed) {
    if (inventoryText.some((item) => item.includes(supply) || supply.includes(item))) {
      hits += 1;
    }
  }
  return hits / needed.length;
}

function setupEffortRank(traits) {
  const value = traits?.setupEffort || "medium";
  if (value === "very-low") return 4;
  if (value === "low") return 3;
  if (value === "medium") return 2;
  return 1;
}

/**
 * Bump times_served / times_shown for library candidates already returned to a user.
 */
export async function recordCandidatesShown({
  userId,
  candidateIds = [],
} = {}) {
  if (!userId || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const uniqueIds = [
    ...new Set(candidateIds.map((id) => String(id)).filter(Boolean)),
  ];

  for (const candidateId of uniqueIds) {
    const { data: candidate } = await supabase
      .from("shared_activity_candidates")
      .select("id, times_served")
      .eq("id", candidateId)
      .maybeSingle();

    if (!candidate) {
      continue;
    }

    await supabase
      .from("shared_activity_candidates")
      .update({
        times_served: (candidate.times_served || 0) + 1,
        updated_at: now,
      })
      .eq("id", candidateId);

    const { data: impression } = await supabase
      .from("user_candidate_impressions")
      .select("*")
      .eq("user_id", userId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (impression) {
      await supabase
        .from("user_candidate_impressions")
        .update({
          last_seen_at: now,
          times_shown: (impression.times_shown || 0) + 1,
        })
        .eq("id", impression.id);
    } else {
      await supabase.from("user_candidate_impressions").insert({
        user_id: userId,
        candidate_id: candidateId,
        first_seen_at: now,
        last_seen_at: now,
        times_shown: 1,
      });
    }
  }
}

/**
 * Pull shared-library candidates for cache-first / Plan B / Rescue.
 * Hard excludes via activityFitPolicy (participants, age, style, time, mess,
 * noise, supervision, space, safety, inventory, clarity).
 */
export async function querySharedCandidatesForUser({
  userId,
  inventory = [],
  currentMoment = {},
  excludeCandidateIds = [],
  excludeCategories = [],
  activityStyle = null,
  childAges = [],
  activityMode = "single-child",
  requestContext = null,
  safetySettings = null,
  limit = 5,
} = {}) {
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("shared_activity_candidates")
    .select("*")
    .eq("is_active", true)
    .order("times_completed", { ascending: false })
    .limit(80);

  const style =
    typeof activityStyle === "string" && activityStyle.trim()
      ? activityStyle.trim().toLowerCase()
      : requestContext?.activity?.style || null;
  if (style === "simple" || style === "imaginative") {
    query = query.eq("activity_style", style);
  }

  const ages = (Array.isArray(childAges) ? childAges : [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age));

  const participantCount =
    requestContext?.participants?.participantCount ??
    (activityMode === "family" ? Math.max(ages.length, 2) : Math.max(ages.length, 1));

  if (participantCount <= 1) {
    query = query.or(
      "participant_mode.is.null,participant_mode.eq.single,participant_max.eq.1,participant_max.is.null"
    );
  }

  if (REQUIRE_VALIDATED_AGE_FIT) {
    query = query.eq("age_fit_validated", true);
  }

  const { data: rows, error } = await query;

  if (error || !rows) {
    console.warn("Could not query shared candidates:", error);
    return [];
  }

  const { data: impressions } = await supabase
    .from("user_candidate_impressions")
    .select("*")
    .eq("user_id", userId);

  const impressionByCandidate = new Map(
    (impressions || []).map((row) => [row.candidate_id, row])
  );

  const exclude = new Set(
    (excludeCandidateIds || []).map((id) => String(id)).filter(Boolean)
  );
  const excludeCats = new Set(
    (excludeCategories || []).map((c) => String(c).toLowerCase())
  );

  const fitContext =
    requestContext ||
    buildFitRequestContextFromParts({
      participants: {
        mode: activityMode,
        participantCount: ages.length || 1,
        children: ages.map((ageYears, index) => ({
          ageYears,
          name: `Child${index + 1}`,
        })),
        childrenContext: ages.map((ageYears, index) => ({
          ageYears,
          name: `Child${index + 1}`,
        })),
      },
      moment: currentMoment,
      safety: {
        ...(safetySettings || {}),
        maxActivityMinutes:
          Number(currentMoment.timeNeededMinutes) ||
          Number(safetySettings?.maxActivityMinutes) ||
          30,
        quietMode:
          safetySettings?.quietMode === true ||
          currentMoment.noiseLevel === "quiet",
      },
      activity: { style },
      inventory,
    });

  const now = Date.now();
  const scored = [];
  const rejectedByReason = {};
  let wrongStyle = 0;
  let ageRejected = 0;
  let participantRejected = 0;

  for (const row of rows) {
    if (exclude.has(String(row.id))) {
      continue;
    }

    const impression = impressionByCandidate.get(row.id);
    if (impression && (impression.times_rejected || 0) >= 1) {
      continue;
    }

    if (style && row.activity_style && row.activity_style !== style) {
      wrongStyle += 1;
      continue;
    }

    const categories = Array.isArray(row.categories) ? row.categories : [];
    if (categories.some((c) => excludeCats.has(String(c).toLowerCase()))) {
      continue;
    }

    const activity = formatSharedCandidate(row);
    const displayCheck = validateActivityForDisplay(row.activity_data, {
      mode: "cached",
    });
    if (!displayCheck.valid) {
      rejectedByReason["display-invalid"] =
        (rejectedByReason["display-invalid"] || 0) + 1;
      void quarantineInvalidCandidate(supabase, row.id, displayCheck.errors);
      continue;
    }

    const fit = evaluateActivityFit(activity, fitContext);
    if (!fit.eligible) {
      for (const reason of fit.hardFailures) {
        rejectedByReason[reason] = (rejectedByReason[reason] || 0) + 1;
        if (reason === "participant-count-mismatch") participantRejected += 1;
        if (
          reason === "age-range-mismatch" ||
          reason === "maturity-mismatch" ||
          reason === "mixed-age-only" ||
          reason === "developmental-complexity"
        ) {
          ageRejected += 1;
        }
      }
      continue;
    }

    const traits = row.traits && typeof row.traits === "object" ? row.traits : {};
    const adultHelp = String(row.adult_help || "optional").toLowerCase();
    let score = 0;
    score += setupEffortRank(traits) * 3;
    score += inventoryOverlapScore(row.supplies, inventory) * 8;
    if (adultHelp === "none") score += 4;
    else if (adultHelp === "optional") score += 2;
    score += Math.max(0, 3 - (row.times_rejected || 0));
    score += Math.min(5, row.times_completed || 0);
    score -= impressionRankingPenalty(impression, now);
    score += scoreActivityAgeMatch(formatCandidateForPolicy(row), ages);
    score += (fit.scores?.interests || 0) * 2;
    if (row.age_fit_validated === true) {
      score += 5;
    }

    scored.push({
      row,
      score,
      impression,
      suppressed: isImpressionSuppressed(impression, now),
    });
  }

  const selected = selectFreshFirstCandidates(scored, limit, now);
  const result = selected.map(({ row }) => formatSharedCandidate(row));

  const freshCount = scored.filter((e) => !e.suppressed).length;
  const suppressedCount = scored.length - freshCount;

  console.info(
    `[recommendation] examined=${rows.length} rejected=${JSON.stringify(rejectedByReason)} eligible=${scored.length} fresh=${freshCount} suppressed=${suppressedCount} returned=${result.length} source=shared_library wrongStyle=${wrongStyle} ageRejected=${ageRejected} participantRejected=${participantRejected}`
  );

  return result;
}

export async function recordCandidateOutcome({
  userId,
  candidateId,
  outcome,
} = {}) {
  if (!userId || !candidateId || !outcome) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data: candidate } = await supabase
    .from("shared_activity_candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate) {
    return;
  }

  const candidatePatch = { updated_at: new Date().toISOString() };
  const impressionPatch = { last_seen_at: new Date().toISOString() };

  if (outcome === "started") {
    candidatePatch.times_started = (candidate.times_started || 0) + 1;
    impressionPatch.times_started = true;
  } else if (outcome === "completed") {
    candidatePatch.times_completed = (candidate.times_completed || 0) + 1;
    // No times_completed column on impressions yet — treat complete as
    // engagement so recency penalties apply (and refresh last_seen_at).
    impressionPatch.ensureEngaged = true;
  } else if (outcome === "rejected") {
    candidatePatch.times_rejected = (candidate.times_rejected || 0) + 1;
    impressionPatch.times_rejected = true;
  }

  await supabase
    .from("shared_activity_candidates")
    .update(candidatePatch)
    .eq("id", candidateId);

  const { data: impression } = await supabase
    .from("user_candidate_impressions")
    .select("*")
    .eq("user_id", userId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (impression) {
    const update = { last_seen_at: impressionPatch.last_seen_at };
    if (impressionPatch.times_started) {
      update.times_started = (impression.times_started || 0) + 1;
    } else if (
      impressionPatch.ensureEngaged &&
      (impression.times_started || 0) === 0
    ) {
      update.times_started = 1;
    }
    if (impressionPatch.times_rejected) {
      update.times_rejected = (impression.times_rejected || 0) + 1;
    }
    await supabase
      .from("user_candidate_impressions")
      .update(update)
      .eq("id", impression.id);
  } else {
    await supabase.from("user_candidate_impressions").insert({
      user_id: userId,
      candidate_id: candidateId,
      times_started:
        outcome === "started" || outcome === "completed" ? 1 : 0,
      times_rejected: outcome === "rejected" ? 1 : 0,
    });
  }
}
