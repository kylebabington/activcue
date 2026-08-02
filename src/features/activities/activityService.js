// src/features/activities/activityService.js

/*
 * Pure helpers used by activity generation and ranking.
 * Re-exports scoring + inventory fit so callers can depend on one feature module.
 */

export {
  getTotalActivityScore,
  buildStructuredPreferenceContext,
  logActivityScoreTable,
  scoreActivityForCurrentMoment,
  scoreActivityFromHistory,
  getActivityDurationMinutes,
  normalizeTextValue,
} from "../../utils/activityScoring";

export {
  activityPassesInventorySoftCheck,
  buildInventoryOnlyFeedback,
  normalizeActivitiesToInventory,
  scoreInventoryMatch,
  getInventoryNames,
} from "../../utils/inventoryFit";

export {
  applySessionFitBoost,
  getSessionFitBoost,
  scoreActivitiesWithSessionFit,
  filterSessionsForFitScore,
  scoreActivitiesForCurrentMoment,
  pickBestActivityForCurrentMoment,
} from "../../utils/sessionFitScore";
