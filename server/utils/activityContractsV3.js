/**
 * Activity format contracts (V3).
 *
 * ActivityGenerationV3 — everything the AI must produce for a live request.
 * Includes request-specific whyItFits.
 *
 * CachedActivityV3 — reusable shared-library payload after sanitizeForSharedLibrary.
 * Excludes household/child/request-specific fields; the client recomputes
 * "why this fits" from the current moment and inventory at serve time.
 */

export const ACTIVITY_GENERATION_V3_REQUIRED = [
  "title",
  "activityStyle",
  "visualTheme",
  "summary",
  "story",
  "roleGuide",
  "ageFit",
  "setupGuide",
  "starterIdeas",
  "stepDetails",
  "finishGuide",
  "uses",
  "energy",
  "mess",
  "adultHelp",
  "estimatedMinutes",
  "categories",
  "traits",
  "whyItFits",
];

export const CACHED_ACTIVITY_V3_REQUIRED = [
  "title",
  "activityStyle",
  "visualTheme",
  "summary",
  "story",
  "roleGuide",
  "ageFit",
  "setupGuide",
  "starterIdeas",
  "stepDetails",
  "finishGuide",
  "uses",
  "energy",
  "mess",
  "adultHelp",
  "estimatedMinutes",
  "categories",
  "traits",
];

export const CACHED_ACTIVITY_V3_EXCLUDED = [
  "whyItFits",
  "childId",
  "childIds",
  "profileId",
  "userId",
  "householdId",
  "momentId",
  "presentedAt",
];
