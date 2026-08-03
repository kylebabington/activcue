// src/features/activities/activityGenerationService.js
// Pure helpers for paid AI generation + free/simple template paths.

import { buildSimpleActivitiesFromTemplates } from "../../utils/simpleActivityTemplates";
import {
  activityPassesInventorySoftCheck,
  buildInventoryOnlyFeedback,
  buildStructuredPreferenceContext,
  normalizeActivitiesToInventory,
} from "./activityService";

export function buildPreferenceFeedback(activityHistory, activityMode, activeChildId) {
  return buildStructuredPreferenceContext(activityHistory, {
    activeChildId: activityMode === "family" ? "" : activeChildId || "",
  });
}

export function shouldUseSimpleTemplates({
  preferSimpleTemplates,
  kidActivityStyle,
}) {
  return preferSimpleTemplates === true && kidActivityStyle === "simple";
}

export function createSimpleTemplateActivities({
  inventory,
  currentMoment,
  count = 3,
}) {
  return buildSimpleActivitiesFromTemplates({
    inventory,
    currentMoment,
    count,
  });
}

export function normalizeGeneratedActivities(rawActivities, inventory) {
  return normalizeActivitiesToInventory(rawActivities, inventory);
}

export function needsInventoryRetry(activities, inventory) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return false;
  }

  return activities.every(
    (activity) => !activityPassesInventorySoftCheck(activity, inventory)
  );
}

export function buildInventoryRetryIntent(inventory) {
  return {
    generationMode: "inventory-retry",
    inventoryHint: buildInventoryOnlyFeedback(inventory),
  };
}

export function buildOfflineFallbackActivities({
  inventory,
  currentMoment,
  count = 3,
}) {
  return buildSimpleActivitiesFromTemplates({
    inventory,
    currentMoment,
    count,
  });
}
