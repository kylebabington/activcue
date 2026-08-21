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
  oldestChildAgeYears = null,
}) {
  return buildSimpleActivitiesFromTemplates({
    inventory,
    currentMoment,
    count,
    oldestChildAgeYears,
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
  oldestChildAgeYears = null,
}) {
  return buildSimpleActivitiesFromTemplates({
    inventory,
    currentMoment,
    count,
    oldestChildAgeYears,
  });
}

/**
 * Hard server rejection codes — never fall back to simple templates.
 */
export const HARD_GENERATION_FAILURE_CODES = new Set([
  "AGE_FIT_FAILED",
  "AI_RESPONSE_INVALID",
  "SUBSCRIPTION_REQUIRED",
]);

/**
 * True when the request is imaginative play (never substitute simple templates).
 */
export function isImaginativeGenerationStyle(activityStyle) {
  return String(activityStyle || "")
    .trim()
    .toLowerCase() === "imaginative";
}

/**
 * Decide how to recover after a paid generation failure.
 *
 * - Simple: offline simple templates are allowed (unless hard failure code).
 * - Imaginative: never simple templates — try shared cache, then AI retry, then fail.
 */
export function resolveGenerationFailureAction({
  activityStyle,
  errorCode = null,
  errorStatus = null,
  alreadyRetriedAi = false,
} = {}) {
  if (
    HARD_GENERATION_FAILURE_CODES.has(errorCode) ||
    errorStatus === 422
  ) {
    return { action: "fail", reason: errorCode || "hard-failure" };
  }

  if (isImaginativeGenerationStyle(activityStyle)) {
    if (!alreadyRetriedAi) {
      return { action: "imaginative_cache_then_retry", reason: "imaginative-recovery" };
    }
    return { action: "fail", reason: "imaginative-exhausted" };
  }

  return { action: "simple_templates", reason: "simple-offline-fallback" };
}

/**
 * Reject any accidental style substitution (imaginative request → simple payload).
 */
export function assertActivitiesMatchRequestedStyle(activities, requestedStyle) {
  if (!isImaginativeGenerationStyle(requestedStyle)) {
    return { ok: true, activities: Array.isArray(activities) ? activities : [] };
  }

  const list = Array.isArray(activities) ? activities : [];
  const mismatched = list.filter((activity) => {
    const style = String(
      activity?.activityStyle || activity?.style || ""
    )
      .trim()
      .toLowerCase();
    return style && style !== "imaginative";
  });

  if (mismatched.length > 0) {
    return {
      ok: false,
      activities: [],
      reason: "style-mismatch",
      mismatchedTitles: mismatched.map((a) => a?.title).filter(Boolean),
    };
  }

  return { ok: true, activities: list };
}
