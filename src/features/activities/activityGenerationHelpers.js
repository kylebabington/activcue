// src/features/activities/activityGenerationHelpers.js

import {
  buildAutoStartIntent,
  buildKidBoredIntent,
  intentToLegacyFeedbackContext,
} from "./activityIntent";

export function getKidEnergyInstruction(energyLevel) {
  return `energyLevel=${energyLevel || "neutral"}`;
}

export function getKidActivityStyleInstruction(activityStyle) {
  return `activityStyle=${activityStyle === "imaginative" ? "imaginative" : "simple"}`;
}

export function buildKidBoredFeedbackContext({
  kidActivityStyle,
  kidEnergyLevel,
}) {
  return intentToLegacyFeedbackContext(
    buildKidBoredIntent({ kidActivityStyle, kidEnergyLevel })
  );
}

export function buildAutoStartFeedbackContext({
  kidActivityStyle,
  kidEnergyLevel,
}) {
  return intentToLegacyFeedbackContext(
    buildAutoStartIntent({ kidActivityStyle, kidEnergyLevel })
  );
}

export function buildKidBoredGenerationIntent({
  kidActivityStyle,
  kidEnergyLevel,
}) {
  return buildKidBoredIntent({ kidActivityStyle, kidEnergyLevel });
}

export function buildAutoStartGenerationIntent({
  kidActivityStyle,
  kidEnergyLevel,
}) {
  return buildAutoStartIntent({ kidActivityStyle, kidEnergyLevel });
}

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
