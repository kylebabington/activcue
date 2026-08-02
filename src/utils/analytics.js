// src/utils/analytics.js

/**
 * Lightweight product analytics — console in development, pluggable sink later.
 */
const PRODUCT_EVENTS = new Set([
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
]);

export function trackProductEvent(eventName, payload = {}) {
  if (!PRODUCT_EVENTS.has(eventName)) {
    return;
  }

  const entry = {
    event: eventName,
    at: new Date().toISOString(),
    ...payload,
  };

  if (import.meta.env.DEV) {
    console.info("[analytics]", entry);
  }

  try {
    const key = "ff_product_events";
    const existing = JSON.parse(window.localStorage.getItem(key) || "[]");
    const next = [...existing, entry].slice(-200);
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Analytics must never break the app.
  }
}
