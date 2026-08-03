// src/utils/analytics.js

import { authenticatedRequest } from "../api/apiClient";
import { supabase } from "../lib/supabaseClient";

/**
 * Lightweight product analytics — console in development, localStorage cache,
 * and fire-and-forget POST to /api/product-events when authenticated.
 *
 * Keep names in sync with server/lib/productEventNames.js
 */
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

const PRODUCT_EVENTS = new Set(PRODUCT_EVENT_NAMES);

const BLOCKED_PROPERTY_KEYS = new Set([
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

function sanitizeClientProperties(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const next = {};
  for (const [key, value] of Object.entries(payload)) {
    if (BLOCKED_PROPERTY_KEYS.has(key) || /note|prompt|instruction/i.test(key)) {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value == null
    ) {
      next[key] = value;
    }
  }
  return next;
}

function cacheLocally(entry) {
  try {
    const key = "ff_product_events";
    const existing = JSON.parse(window.localStorage.getItem(key) || "[]");
    const next = [...existing, entry].slice(-200);
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Analytics must never break the app.
  }
}

async function postProductEventIfAuthenticated(eventName, properties) {
  try {
    const {
      data: sessionData,
    } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.access_token) {
      return;
    }

    await authenticatedRequest("/api/product-events", {
      method: "POST",
      body: JSON.stringify({
        eventName,
        properties,
      }),
    });
  } catch {
    // Fire-and-forget: localStorage remains the fallback cache.
  }
}

export function trackProductEvent(eventName, payload = {}) {
  if (!PRODUCT_EVENTS.has(eventName)) {
    return;
  }

  const properties = sanitizeClientProperties(payload);
  const entry = {
    event: eventName,
    at: new Date().toISOString(),
    ...properties,
  };

  if (import.meta.env.DEV) {
    console.info("[analytics]", entry);
  }

  cacheLocally(entry);
  void postProductEventIfAuthenticated(eventName, properties);
}
