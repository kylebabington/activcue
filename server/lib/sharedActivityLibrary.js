// server/lib/sharedActivityLibrary.js

import { createHash } from "crypto";
import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

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

function stripPrivateFields(activity) {
  if (!activity || typeof activity !== "object") {
    return {};
  }

  const safe = { ...activity };
  delete safe.whyItFits;
  delete safe.presentedAt;
  return safe;
}

function toLibraryRow(activity, { source = "ai", candidateId = null } = {}) {
  const safe = stripPrivateFields(activity);
  const contentHash = computeActivityContentHash(safe);

  return {
    ...(candidateId ? { id: candidateId } : {}),
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
    is_active: true,
    updated_at: new Date().toISOString(),
  };
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
    contentHash: row.content_hash,
    categories: Array.isArray(row.categories) ? row.categories : data.categories || [],
    traits: row.traits && typeof row.traits === "object" ? row.traits : data.traits || {},
    source: row.source,
    timesServed: row.times_served,
    timesStarted: row.times_started,
    timesCompleted: row.times_completed,
    timesRejected: row.times_rejected,
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
} = {}) {
  if (!userId || !Array.isArray(activities) || activities.length === 0) {
    return activities;
  }

  const supabase = getSupabaseAdminClient();
  const resolved = [];

  for (const activity of activities) {
    const row = toLibraryRow(activity, {
      source,
      candidateId: activity.candidateId || null,
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
    const row = toLibraryRow(activity, { source });
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
 * Pull Plan B / Rescue candidates the user has not recently started.
 */
export async function querySharedCandidatesForUser({
  userId,
  inventory = [],
  currentMoment = {},
  excludeCandidateIds = [],
  excludeCategories = [],
  limit = 5,
} = {}) {
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("shared_activity_candidates")
    .select("*")
    .eq("is_active", true)
    .order("times_completed", { ascending: false })
    .limit(80);

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

  const maxMinutes = Number(currentMoment.timeNeededMinutes) || 30;
  const messLimit = String(currentMoment.messLevel || "medium").toLowerCase();
  const messRank = { low: 1, medium: 2, high: 3 };

  const scored = [];

  for (const row of rows) {
    if (exclude.has(String(row.id))) {
      continue;
    }

    const impression = impressionByCandidate.get(row.id);
    if (impression && (impression.times_started || 0) > 0) {
      continue;
    }
    if (impression && (impression.times_rejected || 0) >= 2) {
      continue;
    }

    const categories = Array.isArray(row.categories) ? row.categories : [];
    if (categories.some((c) => excludeCats.has(String(c).toLowerCase()))) {
      continue;
    }

    const minutes = Number(row.estimated_minutes) || 20;
    if (minutes > maxMinutes + 5) {
      continue;
    }

    const rowMess = String(row.mess || "low").toLowerCase();
    if ((messRank[rowMess] || 2) > (messRank[messLimit] || 2)) {
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
    if (impression) {
      score -= Math.min(4, impression.times_shown || 0);
    }

    scored.push({ row, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ row }) => formatSharedCandidate(row));
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
      times_started: outcome === "started" ? 1 : 0,
      times_rejected: outcome === "rejected" ? 1 : 0,
    });
  }
}
