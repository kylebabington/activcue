// src/features/quest/useQuest.js

/*
 * Quest / active-session feature surface.
 *
 * Ownership today:
 * - useActivityTimer + getActivitySecondsRemaining live here
 * - finish/cancel pure helpers live in questSessionHelpers.js
 *
 * Still owned by App.jsx (extract later when safer):
 * - activeActivity / lastCompletedQuest state
 * - step navigation, hints, timer feedback handlers
 * - finishActiveActivity / cancelActiveActivity side effects
 *
 * Import from "./index" or this module; prefer the barrel for app code.
 */

export {
  useActivityTimer,
  getActivitySecondsRemaining,
} from "./useActivityTimer";

export {
  getUniqueCompletedStepIndexes,
  getMinutesWorked,
  buildCompletedQuestSummary,
  buildFinishedHistoryItem,
  buildCanceledHistoryItem,
  buildActivitySessionPayload,
  buildActivitySessionStartPayload,
  buildActivitySessionExitPatch,
  INDEPENDENCE_OUTCOMES,
} from "./questSessionHelpers";
