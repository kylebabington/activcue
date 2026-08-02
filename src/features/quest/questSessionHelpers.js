// src/features/quest/questSessionHelpers.js

import { normalizeActivityStyle } from "../../utils/activityStyle";

/*
 * Pure helpers for finishing / canceling an active quest.
 * Stateful setters still live in App.jsx; these keep summary + history payloads consistent.
 */

export function getUniqueCompletedStepIndexes(activeActivity) {
  const completedStepIndexes = Array.isArray(activeActivity?.completedStepIndexes)
    ? activeActivity.completedStepIndexes
    : [];

  const currentStepIndex = Number(activeActivity?.currentStepIndex) || 0;

  const completedWithCurrentStep = completedStepIndexes.includes(currentStepIndex)
    ? completedStepIndexes
    : [...completedStepIndexes, currentStepIndex];

  return [...new Set(completedWithCurrentStep)];
}

export function getMinutesWorked(activeActivity, finishedAt = Date.now()) {
  const startedAt = Number(activeActivity?.startedAt);

  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return null;
  }

  return Math.max(1, Math.round((finishedAt - startedAt) / 1000 / 60));
}

export function buildCompletedQuestSummary(activeActivity, { finishedAt = Date.now() } = {}) {
  const steps = Array.isArray(activeActivity?.steps) ? activeActivity.steps : [];
  const uniqueCompletedStepIndexes = getUniqueCompletedStepIndexes(activeActivity);
  const minutesWorked = getMinutesWorked(activeActivity, finishedAt);

  return {
    id: crypto.randomUUID(),
    title: activeActivity.title,
    activityStyle: normalizeActivityStyle(activeActivity),
    theme: activeActivity.theme || "",
    summary: activeActivity.summary || "",
    completedAt: new Date(finishedAt).toISOString(),
    completedStepCount: uniqueCompletedStepIndexes.length,
    totalStepCount: steps.length,
    completedStepIndexes: uniqueCompletedStepIndexes,
    minutesWorked,
    uses: Array.isArray(activeActivity.uses) ? activeActivity.uses : [],
    energy: activeActivity.energy || "medium",
    mess: activeActivity.mess || "low",
    adultHelp: activeActivity.adultHelp || "optional",
    activity: activeActivity,
  };
}

export function buildFinishedHistoryItem(
  activeActivity,
  {
    kidMood,
    messLevel,
    locationPreference,
    childAgeRange,
    childId = "",
    childName = "",
    activityMode,
  } = {}
) {
  const steps = Array.isArray(activeActivity?.steps) ? activeActivity.steps : [];
  const uniqueCompletedStepIndexes = getUniqueCompletedStepIndexes(activeActivity);
  const minutesWorked = getMinutesWorked(activeActivity);

  return {
    id: crypto.randomUUID(),
    title: activeActivity.title,
    activityStyle: normalizeActivityStyle(activeActivity),
    feedbackType: "finished",
    createdAt: new Date().toISOString(),
    kidMood,
    messLevel,
    locationPreference,
    childAgeRange,
    childId,
    childName,
    activityMode,
    completedStepCount: uniqueCompletedStepIndexes.length,
    totalStepCount: steps.length,
    minutesWorked,
    energy: activeActivity.energy || "medium",
    mess: activeActivity.mess || "low",
    adultHelp: activeActivity.adultHelp || "optional",
    estimatedMinutes: Number(activeActivity.estimatedMinutes) || null,
    uses: Array.isArray(activeActivity.uses) ? activeActivity.uses : [],
    stepsCount: steps.length,
    steps,
    theme: activeActivity.theme || "",
    summary: activeActivity.summary || "",
  };
}

export function buildCanceledHistoryItem(
  activeActivity,
  {
    kidMood,
    messLevel,
    locationPreference,
    childAgeRange,
  } = {}
) {
  return {
    id: crypto.randomUUID(),
    title: activeActivity.title,
    activityStyle: normalizeActivityStyle(activeActivity),
    feedbackType: "canceled",
    createdAt: new Date().toISOString(),
    kidMood,
    messLevel,
    locationPreference,
    childAgeRange,
    energy: activeActivity.energy || "medium",
    mess: activeActivity.mess || "low",
    adultHelp: activeActivity.adultHelp || "optional",
    estimatedMinutes: Number(activeActivity.estimatedMinutes) || null,
    uses: Array.isArray(activeActivity.uses) ? activeActivity.uses : [],
    stepsCount: Array.isArray(activeActivity.steps) ? activeActivity.steps.length : 0,
  };
}

/*
 * Payload shape for POST /api/family-memory/activity-sessions (camelCase client API).
 */
export function buildActivitySessionPayload(
  activeActivity,
  currentMoment,
  {
    childId = "",
    finishedAt = Date.now(),
    completionStatus = "finished",
    independenceRating = null,
  } = {}
) {
  const startedAt = Number(activeActivity?.startedAt);
  const minutesWorked = getMinutesWorked(activeActivity, finishedAt);

  return {
    childId,
    activityTitle: activeActivity?.title || "Activity",
    activityStyle: normalizeActivityStyle(activeActivity),
    requestedMinutes:
      Number(activeActivity?.durationMinutes) ||
      Number(activeActivity?.estimatedMinutes) ||
      Number(currentMoment?.timeNeededMinutes) ||
      null,
    startedAt:
      Number.isFinite(startedAt) && startedAt > 0
        ? new Date(startedAt).toISOString()
        : new Date(finishedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    parentActivity: currentMoment?.parentActivity || null,
    parentAvailability: currentMoment?.availability || null,
    space: currentMoment?.space || null,
    noiseLimit: currentMoment?.noiseLevel || null,
    messLimit: currentMoment?.messLevel || null,
    supervisionLevel: currentMoment?.supervisionLevel || null,
    activityEnergy: activeActivity?.energy || null,
    activityMess: activeActivity?.mess || null,
    activityAdultHelp: activeActivity?.adultHelp || null,
    activitySupplies: Array.isArray(activeActivity?.uses) ? activeActivity.uses : [],
    actualMinutes: minutesWorked,
    completionStatus,
    independenceRating,
  };
}

export const INDEPENDENCE_OUTCOMES = [
  {
    value: "worked-great",
    label: "Worked great",
  },
  {
    value: "needed-me-few-times",
    label: "Needed me a few times",
  },
  {
    value: "didnt-last",
    label: "Didn't last",
  },
];
