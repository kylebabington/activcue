/**
 * Display vs generation counts for activity suggestions.
 * Users always receive at most SUGGESTION_COUNT; OpenAI may produce more for headroom.
 */
export const SUGGESTION_COUNT = 3;
export const MAX_AI_GENERATE_COUNT = 5;

/** Shown ≥ this many times → suppressed while fresh candidates exist. */
export const IMPRESSION_SUPPRESS_TIMES_SHOWN = 3;
/** Seen within this many days → suppressed while fresh candidates exist. */
export const IMPRESSION_SUPPRESS_RECENT_DAYS = 14;

/**
 * How many activities to ask OpenAI for given remaining user-facing slots.
 * need 1 → 3, need 2 → 4, need 3 → 5
 */
export function computeAiGenerateCount(slotsNeeded) {
  const slots = Math.max(1, Number(slotsNeeded) || 1);
  return Math.min(MAX_AI_GENERATE_COUNT, slots + 2);
}

/** V4 imaginative: request exactly the missing display slots (no over-generation). */
export function computeV4ImaginativeGenerateCount(slotsNeeded) {
  const slots = Math.max(1, Number(slotsNeeded) || 1);
  return Math.min(MAX_AI_GENERATE_COUNT, slots);
}

/**
 * Clamp a requested generation count for prompts / token budgets.
 */
export function clampAiGenerateCount(activityCount) {
  return Math.max(
    1,
    Math.min(MAX_AI_GENERATE_COUNT, Number(activityCount) || SUGGESTION_COUNT)
  );
}

/**
 * True when an impression should sit in the suppressed pool (not permanent ban).
 */
export function isImpressionSuppressed(impression, now = Date.now()) {
  if (!impression) {
    return false;
  }
  const timesShown = Number(impression.times_shown) || 0;
  if (timesShown >= IMPRESSION_SUPPRESS_TIMES_SHOWN) {
    return true;
  }
  const lastSeen = impression.last_seen_at || impression.first_seen_at;
  if (!lastSeen) {
    return false;
  }
  const t = Date.parse(lastSeen);
  if (!Number.isFinite(t)) {
    return false;
  }
  const days = Math.max(0, (now - t) / (24 * 60 * 60 * 1000));
  return days < IMPRESSION_SUPPRESS_RECENT_DAYS;
}

/**
 * Prefer fresh scored candidates; backfill from suppressed when short of limit.
 * Each entry: { row, score, impression?, suppressed?: boolean }
 */
export function selectFreshFirstCandidates(scoredEntries, limit, now = Date.now()) {
  const cap = Math.max(0, Number(limit) || 0);
  if (cap === 0 || !Array.isArray(scoredEntries) || scoredEntries.length === 0) {
    return [];
  }

  const fresh = [];
  const suppressed = [];
  for (const entry of scoredEntries) {
    const suppressedFlag =
      entry.suppressed === true ||
      isImpressionSuppressed(entry.impression, now);
    if (suppressedFlag) {
      suppressed.push(entry);
    } else {
      fresh.push(entry);
    }
  }

  fresh.sort((a, b) => b.score - a.score);
  suppressed.sort((a, b) => {
    const shownA = Number(a.impression?.times_shown) || 0;
    const shownB = Number(b.impression?.times_shown) || 0;
    if (shownA !== shownB) return shownA - shownB;
    const seenA = Date.parse(
      a.impression?.last_seen_at || a.impression?.first_seen_at || 0
    );
    const seenB = Date.parse(
      b.impression?.last_seen_at || b.impression?.first_seen_at || 0
    );
    const tA = Number.isFinite(seenA) ? seenA : 0;
    const tB = Number.isFinite(seenB) ? seenB : 0;
    if (tA !== tB) return tA - tB;
    return b.score - a.score;
  });

  const selected = fresh.slice(0, cap);
  if (selected.length < cap) {
    selected.push(...suppressed.slice(0, cap - selected.length));
  }
  return selected;
}

/**
 * Merge first-pass AI survivors with refill survivors up to aiSlots.
 */
export function takeAiFill(eligibleFirst, eligibleRefill, aiSlots) {
  const need = Math.max(0, Number(aiSlots) || 0);
  const first = Array.isArray(eligibleFirst) ? eligibleFirst : [];
  const refill = Array.isArray(eligibleRefill) ? eligibleRefill : [];
  return [...first, ...refill].slice(0, need);
}
