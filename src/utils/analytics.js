// src/utils/analytics.js

import { authenticatedRequest } from "../api/apiClient";
import { supabase } from "../lib/supabaseClient";
import {
  clearOfflineQueue,
  enqueueOfflineEvent,
  readOfflineQueue,
} from "./offlineQueue";

/**
 * Lightweight product analytics — console in development, localStorage cache,
 * batched POST to /api/product-events when authenticated.
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
  "moment_created",
  "generation_requested",
  "recommendations_shown",
  "activity_selected",
  "activity_rejected",
  "activity_completed",
  "plan_b_used",
  "plan_b_offered",
  "plan_b_started",
  "plan_b_rejected",
  "rescue_started",
  "rescue_successful",
  "rescue_plan_b_used",
  "checkout_started",
  "onboarding_step_completed",
  "onboarding_completed",
  "onboarding_skipped",
  "activity_details_opened",
  "first_step_started",
  "step_completed",
  "starter_idea_opened",
  "built_in_help_opened",
  "ai_hint_requested",
  "activation_signup_prompted",
]);

const PRODUCT_EVENTS = new Set(PRODUCT_EVENT_NAMES);
const SESSION_KEY = "ff_analytics_session";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "dev";

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

let pendingBatch = [];
let flushTimer = null;
let listenersBound = false;

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

export function getAnalyticsSessionId() {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous-session";
  }
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

async function postBatch(events) {
  if (!events.length) {
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    events.forEach((event) => enqueueOfflineEvent(event));
    return;
  }

  try {
    const {
      data: sessionData,
    } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.access_token) {
      return;
    }

    await authenticatedRequest("/api/product-events/batch", {
      method: "POST",
      body: JSON.stringify({ events }),
    });
  } catch {
    // Fall back to single-event posts.
    for (const event of events) {
      try {
        await authenticatedRequest("/api/product-events", {
          method: "POST",
          body: JSON.stringify(event),
        });
      } catch {
        enqueueOfflineEvent(event);
      }
    }
  }
}

export async function flushProductEventBatch() {
  const offline = readOfflineQueue();
  const batch = [...offline, ...pendingBatch];
  pendingBatch = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!batch.length) {
    return;
  }
  clearOfflineQueue();
  await postBatch(batch);
}

function scheduleFlush() {
  if (flushTimer) {
    return;
  }
  flushTimer = setTimeout(() => {
    void flushProductEventBatch();
  }, 2000);
}

function ensureAnalyticsListeners() {
  if (listenersBound || typeof window === "undefined") {
    return;
  }
  listenersBound = true;

  const flush = () => {
    void flushProductEventBatch();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  });
  window.addEventListener("pagehide", flush);
  window.addEventListener("online", () => {
    void flushProductEventBatch();
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SYNC_QUEUE" });
    }
  });
}

export function trackProductEvent(eventName, payload = {}) {
  if (!PRODUCT_EVENTS.has(eventName)) {
    return;
  }

  ensureAnalyticsListeners();

  const properties = sanitizeClientProperties(payload);
  const event = {
    eventName,
    properties,
    sessionId: getAnalyticsSessionId(),
    appVersion: APP_VERSION,
  };

  const entry = {
    event: eventName,
    at: new Date().toISOString(),
    sessionId: event.sessionId,
    appVersion: APP_VERSION,
    ...properties,
  };

  if (import.meta.env.DEV) {
    console.info("[analytics]", entry);
  }

  cacheLocally(entry);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    enqueueOfflineEvent(event);
    return;
  }

  pendingBatch.push(event);
  if (pendingBatch.length >= 5) {
    void flushProductEventBatch();
  } else {
    scheduleFlush();
  }
}
