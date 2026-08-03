// server/routes/productEvents.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import {
  PRODUCT_EVENT_BLOCKED_PROPERTY_KEYS,
  PRODUCT_EVENT_NAME_SET,
} from "../lib/productEventNames.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";

const router = Router();

const MAX_PROPERTY_KEYS = 24;
const MAX_STRING_LENGTH = 120;
const MAX_ARRAY_LENGTH = 12;
const MAX_BATCH = 40;

function sanitizePropertyValue(value, depth = 0) {
  if (depth > 2) {
    return undefined;
  }

  if (value == null) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    return value.trim().slice(0, MAX_STRING_LENGTH);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizePropertyValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    return sanitizeProperties(value, depth + 1);
  }

  return undefined;
}

function sanitizeProperties(rawProperties, depth = 0) {
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

    const nextValue = sanitizePropertyValue(value, depth);
    if (nextValue !== undefined) {
      sanitized[normalizedKey] = nextValue;
    }
  }

  return sanitized;
}

function parseEventRow(body, userId) {
  const eventName =
    typeof body?.eventName === "string"
      ? body.eventName.trim()
      : typeof body?.event === "string"
        ? body.event.trim()
        : "";

  if (!eventName || !PRODUCT_EVENT_NAME_SET.has(eventName)) {
    return null;
  }

  return {
    user_id: userId,
    event_name: eventName,
    properties: sanitizeProperties(body?.properties),
    session_id:
      typeof body?.sessionId === "string"
        ? body.sessionId.trim().slice(0, 120)
        : typeof body?.session_id === "string"
          ? body.session_id.trim().slice(0, 120)
          : null,
    app_version:
      typeof body?.appVersion === "string"
        ? body.appVersion.trim().slice(0, 40)
        : typeof body?.app_version === "string"
          ? body.app_version.trim().slice(0, 40)
          : null,
  };
}

/*
 * POST /api/product-events
 */
router.post(
  "/product-events",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const row = parseEventRow(req.body, req.auth.userId);
      if (!row) {
        return res.status(400).json({
          error: "Unknown or disallowed product event.",
          code: "PRODUCT_EVENT_NOT_ALLOWED",
        });
      }

      const supabase = getSupabaseAdminClient();
      const { error } = await supabase.from("product_events").insert(row);

      if (error) {
        console.error("Could not insert product event:", error);
        return res.status(500).json({
          error: "Could not record product event.",
          code: "PRODUCT_EVENT_INSERT_FAILED",
        });
      }

      return res.status(202).json({ recorded: true });
    } catch (error) {
      console.error("Unexpected product event failure:", error);
      return res.status(500).json({
        error: "Could not record product event.",
        code: "PRODUCT_EVENT_FAILED",
      });
    }
  }
);

/*
 * POST /api/product-events/batch
 */
router.post(
  "/product-events/batch",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const events = Array.isArray(req.body?.events) ? req.body.events : [];
      const rows = events
        .slice(0, MAX_BATCH)
        .map((event) => parseEventRow(event, req.auth.userId))
        .filter(Boolean);

      if (rows.length === 0) {
        return res.status(400).json({
          error: "No valid product events in batch.",
          code: "PRODUCT_EVENT_BATCH_EMPTY",
        });
      }

      const supabase = getSupabaseAdminClient();
      const { error } = await supabase.from("product_events").insert(rows);

      if (error) {
        console.error("Could not insert product event batch:", error);
        return res.status(500).json({
          error: "Could not record product events.",
          code: "PRODUCT_EVENT_BATCH_FAILED",
        });
      }

      return res.status(202).json({ recorded: rows.length });
    } catch (error) {
      console.error("Unexpected product event batch failure:", error);
      return res.status(500).json({
        error: "Could not record product events.",
        code: "PRODUCT_EVENT_BATCH_FAILED",
      });
    }
  }
);

export default router;
