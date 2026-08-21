// src/utils/presetDemo.js

/**
 * Helpers for unpaid/demo generation from the curated preset library.
 * No AI calls — rotation and unlock eligibility only.
 */

export function isFreeImaginativeUnlockUsed(entitlement) {
  return Boolean(entitlement?.freeImaginativeActivityId);
}

/**
 * Activities eligible for unpaid rotation / auto-start for a given style.
 *
 * - simple: all unlocked simple presets
 * - imaginative, unlock unused: all imaginative (may be locked until start)
 * - imaginative, unlock used: only the already-unlocked one
 * - optional selectedChildProfiles: defensive age filter via ageFit
 */
export function getEligiblePresets(
  activities,
  style,
  entitlement,
  selectedChildProfiles = []
) {
  const list = Array.isArray(activities) ? activities : [];
  let forStyle = list.filter(
    (activity) => activity?.activityStyle === style
  );

  const ages = (Array.isArray(selectedChildProfiles) ? selectedChildProfiles : [])
    .map((profile) => {
      if (Number.isFinite(Number(profile?.ageYears))) {
        return Number(profile.ageYears);
      }
      return null;
    })
    .filter((age) => Number.isFinite(age));

  if (ages.length > 0) {
    forStyle = forStyle.filter((activity) => {
      const ageFit = activity?.ageFit;
      if (!ageFit || typeof ageFit !== "object") {
        return false;
      }
      const minAge = Number(ageFit.minAge ?? activity.minAge ?? activity.age_min);
      const maxAge = Number(ageFit.maxAge ?? activity.maxAge ?? activity.age_max);
      if (!Number.isFinite(minAge) || !Number.isFinite(maxAge)) {
        return false;
      }
      return ages.every((age) => age >= minAge && age <= maxAge);
    });
  }

  // Single selected child cannot receive multi-role / group-only presets.
  if (ages.length <= 1) {
    forStyle = forStyle.filter((activity) => {
      const roles = Array.isArray(activity?.roleGuide?.childRoles)
        ? activity.roleGuide.childRoles
        : [];
      if (roles.length >= 2) {
        return false;
      }
      const mode = String(
        activity?.participantMode ||
          activity?.participant_mode ||
          activity?.traits?.socialMode ||
          ""
      ).toLowerCase();
      if (mode === "group" || mode === "family") {
        return false;
      }
      const min = Number(activity?.participantMin ?? activity?.participant_min);
      if (Number.isFinite(min) && min > 1) {
        return false;
      }
      return true;
    });
  }

  if (style !== "imaginative") {
    return forStyle.filter((activity) => activity && !activity.isLocked);
  }

  if (!isFreeImaginativeUnlockUsed(entitlement)) {
    return forStyle;
  }

  const unlockedId = entitlement.freeImaginativeActivityId;
  return forStyle.filter(
    (activity) =>
      activity &&
      !activity.isLocked &&
      activity.id === unlockedId
  );
}

/**
 * Take the next `count` items from a list starting at index, wrapping.
 * Returns { slice, nextIndex }.
 */
export function takeRotatedSlice(items, startIndex, count) {
  const pool = Array.isArray(items) ? items : [];
  if (pool.length === 0) {
    return { slice: [], nextIndex: 0 };
  }

  const size = Math.min(Math.max(count, 1), pool.length);
  const start =
    ((Number(startIndex) || 0) % pool.length + pool.length) % pool.length;
  const slice = [];

  for (let offset = 0; offset < size; offset += 1) {
    slice.push(pool[(start + offset) % pool.length]);
  }

  return {
    slice,
    nextIndex: (start + size) % pool.length,
  };
}

/**
 * Take a single next item from the pool (for Start for me).
 */
export function takeRotatedOne(items, startIndex) {
  const { slice, nextIndex } = takeRotatedSlice(items, startIndex, 1);
  return {
    activity: slice[0] || null,
    nextIndex,
  };
}
