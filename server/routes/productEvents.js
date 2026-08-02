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

/*
 * POST /api/product-events
 *
 * Body: { eventName: string, properties?: object }
 *
 * Authenticated fire-and-forget analytics. Allowlisted event names only.
 * Never stores child notes or prompts.
 */
router.post(
  "/product-events",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    try {
      const eventName =
        typeof req.body?.eventName === "string"
          ? req.body.eventName.trim()
          : typeof req.body?.event === "string"
            ? req.body.event.trim()
            : "";

      if (!eventName || !PRODUCT_EVENT_NAME_SET.has(eventName)) {
        return res.status(400).json({
          error: "Unknown or disallowed product event.",
          code: "PRODUCT_EVENT_NOT_ALLOWED",
        });
      }

      const properties = sanitizeProperties(req.body?.properties);

      const supabase = getSupabaseAdminClient();
      const { error } = await supabase.from("product_events").insert({
        user_id: req.auth.userId,
        event_name: eventName,
        properties,
      });

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

export default router;
