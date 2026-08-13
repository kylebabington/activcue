// server/lib/recordProductEvent.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";
import {
  PRODUCT_EVENT_BLOCKED_PROPERTY_KEYS,
  PRODUCT_EVENT_NAME_SET,
} from "./productEventNames.js";

const MAX_PROPERTY_KEYS = 24;
const MAX_STRING_LENGTH = 120;

function sanitizeProperties(rawProperties) {
  if (!rawProperties || typeof rawProperties !== "object" || Array.isArray(rawProperties)) {
    return {};
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(rawProperties)) {
    if (Object.keys(sanitized).length >= MAX_PROPERTY_KEYS) {
      break;
    }

    if (typeof key !== "string" || !key.trim()) {
      continue;
    }

    const normalizedKey = key.trim();
    if (PRODUCT_EVENT_BLOCKED_PROPERTY_KEYS.has(normalizedKey)) {
      continue;
    }
    if (/note|prompt|instruction/i.test(normalizedKey)) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value == null
    ) {
      sanitized[normalizedKey] =
        typeof value === "string" ? value.trim().slice(0, MAX_STRING_LENGTH) : value;
    }
  }

  return sanitized;
}

/**
 * Insert a single allowlisted product event via service role.
 * Used for server-owned funnel signals (signup_completed, subscription_started).
 */
export async function recordProductEvent({
  userId = null,
  eventName,
  properties = {},
  sessionId = null,
  appVersion = null,
} = {}) {
  if (!eventName || !PRODUCT_EVENT_NAME_SET.has(eventName)) {
    return { ok: false, reason: "not_allowed" };
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("product_events").insert({
    user_id: userId || null,
    event_name: eventName,
    properties: sanitizeProperties(properties),
    session_id:
      typeof sessionId === "string" ? sessionId.trim().slice(0, 120) : null,
    app_version:
      typeof appVersion === "string" ? appVersion.trim().slice(0, 40) : null,
  });

  if (error) {
    console.error(`Could not record product event ${eventName}:`, error);
    return { ok: false, reason: "insert_failed", error };
  }

  return { ok: true };
}

/**
 * Record a once-per-user product event (idempotent).
 */
async function recordProductEventOnce(userId, eventName, properties = {}) {
  if (!userId) {
    return { ok: false, reason: "missing_user" };
  }

  if (!eventName || !PRODUCT_EVENT_NAME_SET.has(eventName)) {
    return { ok: false, reason: "not_allowed" };
  }

  const supabase = getSupabaseAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("product_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_name", eventName)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error(`Could not check ${eventName}:`, lookupError);
    return { ok: false, reason: "lookup_failed", error: lookupError };
  }

  if (existing?.id) {
    return { ok: true, duplicate: true };
  }

  return recordProductEvent({
    userId,
    eventName,
    properties,
  });
}

/**
 * Record subscription_started once per user (idempotent).
 */
export async function recordSubscriptionStartedOnce(userId, properties = {}) {
  return recordProductEventOnce(userId, "subscription_started", properties);
}

/**
 * Record first_activity_generated once per user (idempotent).
 */
export async function recordFirstActivityGeneratedOnce(userId, properties = {}) {
  return recordProductEventOnce(userId, "first_activity_generated", properties);
}
