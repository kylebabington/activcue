// Keep in sync with PRODUCT_EVENT_NAMES in src/utils/analytics.js

export const PRODUCT_EVENT_NAMES = Object.freeze([
  "account_created",
  "activity_generated",
  "quick_activity_generated",
  "activity_started",
  "activity_finished",
  "activity_abandoned",
  "activity_successful",
  "subscription_started",
  "subscription_cancelled",
  "subscription_resumed",
  "AI_error",
  "rescue_mode_started",
  "im_bored",
  "quick_ideas",
  "unlock_used",
  "plus_checkout_started",
  "plus_checkout_succeeded",
  "independence_outcome",
  "regenerate",
  "time_to_start",
  "plan_b_next_best",
]);

export const PRODUCT_EVENT_NAME_SET = new Set(PRODUCT_EVENT_NAMES);

/** Properties that must never be persisted server-side. */
export const PRODUCT_EVENT_BLOCKED_PROPERTY_KEYS = new Set([
  "note",
  "notes",
  "childNote",
  "childNotes",
  "child_note",
  "child_notes",
  "prompt",
  "prompts",
  "systemPrompt",
  "userPrompt",
  "instructions",
  "input",
]);
