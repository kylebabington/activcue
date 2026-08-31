/**
 * Activity format contracts (V4 — imaginative-only causal story).
 */

export const ACTIVITY_GENERATION_V4_REQUIRED = [
  "activityFormatVersion",
  "qualityContractVersion",
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

export const CACHED_ACTIVITY_V4_REQUIRED = [
  "activityFormatVersion",
  "qualityContractVersion",
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

export const CACHED_ACTIVITY_V4_EXCLUDED = [
  "whyItFits",
  "childId",
  "childIds",
  "profileId",
  "userId",
  "householdId",
  "momentId",
  "presentedAt",
];
