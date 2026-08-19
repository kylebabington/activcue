// src/utils/analytics.js

import { authenticatedRequest, publicRequest } from "../api/apiClient";
import { supabase } from "../lib/supabaseClient";
import {
  clearOfflineQueue,
  enqueueOfflineEvent,
  readOfflineQueue,
} from "./offlineQueue";

/**
 * Lightweight product analytics — console in development, localStorage cache,
 * batched POST to /api/product-events (authenticated) or /api/product-events/public
 * (anonymous landing/demo funnel).
 *
 * Keep names in sync with server/lib/productEventNames.js
 */
export const PRODUCT_EVENT_NAMES = Object.freeze([
  // Phase 1 growth funnel
  "landing_page_viewed",
  "demo_started",
  "demo_activity_generated",
  "demo_completed",
  "signup_started",
  "signup_completed",
  "pricing_viewed",
  "checkout_started",
  "subscription_started",
  // Existing product events
  "account_created",
  "activity_generated",
  "first_activity_generated",
  "quick_activity_generated",
  "activity_started",
  "activity_setup_viewed",
  "activity_setup_completed",
  "activity_scene_started",
  "activity_scene_completed",
  "activity_stuck_clicked",
  "activity_finished",
  "activity_abandoned",
  "activity_successful",
  "subscription_cancelled",
  "subscription_resumed",
  "AI_error",
  "rescue_mode_started",
  "rescue_mode_opened",
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
  "onboarding_step_completed",
  "onboarding_completed",
  "onboarding_skipped",
  "activity_details_opened",
  "first_step_started",
  "step_completed",
  "starter_idea_opened",
  "built_in_help_opened",
  "ai_hint_requested",
  "speech_read_requested",
  "listening_mode_toggled",
  "listening_step_completed",
  "activation_signup_prompted",
  "landing_signup_cta_clicked",
  "landing_demo_moment_selected",
  "landing_demo_results_viewed",
  "landing_demo_activity_opened",
  "landing_demo_video_played",
  "landing_demo_video_opened",
  "landing_demo_cta_clicked",
  "landing_demo_age_toggled",
  "landing_demo_plan_b_clicked",
  "demo_page_moment_selected",
  "demo_page_results_viewed",
  "demo_page_activity_opened",
  "demo_page_cta_clicked",
  "demo_page_age_toggled",
  "demo_page_plan_b_clicked",
  "demo_page_unlock_claimed",
  "demo_page_signup_cta_clicked",
  "demo_page_plus_cta_clicked",
  "demo_page_activity_finished",
  "feedback_submitted",
]);

/** Events that may be sent without auth (must match server PUBLIC_PRODUCT_EVENT_NAMES). */
export const PUBLIC_PRODUCT_EVENT_NAMES = Object.freeze([
  "landing_page_viewed",
  "demo_started",
  "demo_activity_generated",
  "demo_completed",
  "signup_started",
  "pricing_viewed",
  "checkout_started",
  "landing_demo_moment_selected",
  "landing_demo_results_viewed",
  "landing_demo_activity_opened",
  "landing_demo_video_played",
  "landing_demo_video_opened",
  "landing_demo_cta_clicked",
  "landing_demo_age_toggled",
  "landing_demo_plan_b_clicked",
  "landing_signup_cta_clicked",
  "demo_page_moment_selected",
  "demo_page_results_viewed",
  "demo_page_activity_opened",
  "demo_page_cta_clicked",
  "demo_page_age_toggled",
  "demo_page_plan_b_clicked",
  "demo_page_unlock_claimed",
  "demo_page_signup_cta_clicked",
  "demo_page_plus_cta_clicked",
  "demo_page_activity_finished",
]);

const PRODUCT_EVENTS = new Set(PRODUCT_EVENT_NAMES);
const PUBLIC_PRODUCT_EVENTS = new Set(PUBLIC_PRODUCT_EVENT_NAMES);
const SESSION_KEY = "ff_analytics_session";
const ATTRIBUTION_KEY = "ff_attribution";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "dev";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
];

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
      next[key] = typeof value === "string" ? value.trim().slice(0, 120) : value;
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

/**
 * Capture UTM / ref params from the current URL into sessionStorage.
 * First-touch within the tab session wins (does not overwrite existing keys).
 */
export function captureAttribution(search = typeof window !== "undefined" ? window.location.search : "") {
  try {
    const params = new URLSearchParams(search);
    const existing = getAttribution();
    const next = { ...existing };
    let changed = false;

    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value && !next[key]) {
        next[key] = value.trim().slice(0, 120);
        changed = true;
      }
    }

    if (changed) {
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
    }

    return next;
  } catch {
    return {};
  }
}

export function getAttribution() {
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return sanitizeClientProperties(parsed);
  } catch {
    return {};
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

function splitByAuthRequirement(events) {
  const publicEvents = [];
  const authEvents = [];
  for (const event of events) {
    if (PUBLIC_PRODUCT_EVENTS.has(event.eventName)) {
      publicEvents.push(event);
    } else {
      authEvents.push(event);
    }
  }
  return { publicEvents, authEvents };
}

async function postPublicBatch(events) {
  if (!events.length) {
    return;
  }

  await publicRequest("/api/product-events/public/batch", {
    method: "POST",
    body: JSON.stringify({ events }),
  });
}

async function postAuthenticatedBatch(events) {
  if (!events.length) {
    return;
  }

  await authenticatedRequest("/api/product-events/batch", {
    method: "POST",
    body: JSON.stringify({ events }),
  });
}

async function postBatch(events) {
  if (!events.length) {
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    events.forEach((event) => enqueueOfflineEvent(event));
    return;
  }

  const { publicEvents, authEvents } = splitByAuthRequirement(events);

  try {
    const {
      data: sessionData,
    } = await supabase.auth.getSession();
    const session = sessionData?.session;
    const hasAuth = Boolean(session?.access_token);

    if (hasAuth) {
      // Authenticated path can accept all allowlisted events with user_id.
      await postAuthenticatedBatch(events);
      return;
    }

    // Anonymous: only public-safe events reach the server.
    if (publicEvents.length) {
      await postPublicBatch(publicEvents);
    }

    // Non-public events without a session stay queued for later auth flush.
    for (const event of authEvents) {
      enqueueOfflineEvent(event);
    }
  } catch {
    events.forEach((event) => enqueueOfflineEvent(event));
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

  const properties = sanitizeClientProperties({
    ...getAttribution(),
    ...payload,
  });
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

const FIRST_ACTIVITY_GENERATED_FLAG = "ff_first_activity_generated";

/**
 * Fire first_activity_generated at most once per browser profile.
 * Server Admin Growth counts distinct users, so cross-device duplicates are fine.
 */
export function trackFirstActivityGeneratedOnce(payload = {}) {
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage.getItem(FIRST_ACTIVITY_GENERATED_FLAG) === "1") {
        return;
      }
      window.localStorage.setItem(FIRST_ACTIVITY_GENERATED_FLAG, "1");
    } catch {
      // Still attempt to record once this page load.
    }
  }
  trackProductEvent("first_activity_generated", payload);
}
