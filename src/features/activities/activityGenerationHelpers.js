// src/features/activities/activityGenerationHelpers.js

export function filterStartableActivities({
  activities,
  freeImaginativeUnlockUsed,
  freeImaginativeActivityId,
}) {
  if (!Array.isArray(activities)) {
    return [];
  }

  if (!freeImaginativeUnlockUsed) {
    return activities.filter(Boolean);
  }

  return activities.filter(
    (activity) =>
      activity &&
      (!activity.isLocked ||
        (freeImaginativeActivityId && activity.id === freeImaginativeActivityId))
  );
}
