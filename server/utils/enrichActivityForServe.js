// server/utils/enrichActivityForServe.js
//
// Bring cached / curated activities up to the same serve-time shape as fresh
// AI suggestions: story voice for older imaginative V2 content, then full
// normalize (V2 or V3).

import { storyifyCachedImaginativeActivity } from "../../src/features/demo/storyifyCachedImaginativeActivity.js";
import { normalizeActivity } from "./normalizeRequest.js";

/**
 * Enrich an activity before returning it to the client.
 * Safe to call on already-V3 or already-storyified payloads (those are no-ops
 * for storyify; normalize still stamps a consistent shape).
 */
export function enrichActivityForServe(
  activity,
  safeActivityStyle = "imaginative",
  fallbackAges = []
) {
  if (!activity || typeof activity !== "object") {
    return activity;
  }

  const withStyle = {
    ...activity,
    activityStyle:
      activity.activityStyle === "simple" ||
      activity.activityStyle === "imaginative"
        ? activity.activityStyle
        : safeActivityStyle,
  };

  const storyified = storyifyCachedImaginativeActivity(withStyle);
  return normalizeActivity(storyified, safeActivityStyle, fallbackAges);
}

export function enrichActivitiesForServe(
  activities,
  safeActivityStyle = "imaginative",
  fallbackAges = []
) {
  if (!Array.isArray(activities)) return [];
  return activities.map((activity) =>
    enrichActivityForServe(activity, safeActivityStyle, fallbackAges)
  );
}
