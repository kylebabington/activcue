// server/routes/barcodeLookup.js

import { Router } from "express";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import { familyDataRateLimiter } from "../middleware/rateLimits.js";
import { mapProductToInventoryCategory } from "../lib/mapProductToInventoryCategory.js";

const router = Router();

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const lookupCache = new Map();

function isValidBarcode(code) {
  return /^\d{8,14}$/.test(code);
}

function getCachedLookup(code) {
  const entry = lookupCache.get(code);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    lookupCache.delete(code);
    return null;
  }

  return entry.value;
}

function setCachedLookup(code, value) {
  lookupCache.set(code, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  // Bound memory for a long-lived process.
  if (lookupCache.size > 500) {
    const oldestKey = lookupCache.keys().next().value;
    lookupCache.delete(oldestKey);
  }
}

function buildLookupUrl(code) {
  const hasKey = Boolean(process.env.UPCITEMDB_USER_KEY?.trim());
  const base = hasKey
    ? "https://api.upcitemdb.com/prod/v1/lookup"
    : "https://api.upcitemdb.com/prod/trial/lookup";

  return `${base}?upc=${encodeURIComponent(code)}`;
}

function buildLookupHeaders() {
  const headers = {
    Accept: "application/json",
  };

  const userKey = process.env.UPCITEMDB_USER_KEY?.trim();
  if (userKey) {
    headers.user_key = userKey;
    headers.key_type = "3scale";
  }

  return headers;
}

function notFoundResult(code) {
  return {
    code,
    name: "",
    brand: "",
    categoryHint: "Other",
    found: false,
  };
}

async function lookupUpc(code) {
  const cached = getCachedLookup(code);
  if (cached) {
    return cached;
  }

  const response = await fetch(buildLookupUrl(code), {
    method: "GET",
    headers: buildLookupHeaders(),
  });

  if (response.status === 404) {
    const miss = notFoundResult(code);
    setCachedLookup(code, miss);
    return miss;
  }

  if (!response.ok) {
    const error = new Error(
      `Product lookup failed with status ${response.status}.`
    );
    error.status = response.status === 429 ? 429 : 502;
    error.code =
      response.status === 429
        ? "BARCODE_LOOKUP_RATE_LIMITED"
        : "BARCODE_LOOKUP_FAILED";
    throw error;
  }

  const body = await response.json();
  const item = Array.isArray(body?.items) ? body.items[0] : null;

  if (!item) {
    const miss = notFoundResult(code);
    setCachedLookup(code, miss);
    return miss;
  }

  const name =
    typeof item.title === "string" ? item.title.trim() : "";
  const brand =
    typeof item.brand === "string" ? item.brand.trim() : "";
  const remoteCategory = Array.isArray(item.category)
    ? item.category.join(" ")
    : typeof item.category === "string"
      ? item.category
      : "";

  const result = {
    code,
    name,
    brand,
    categoryHint: mapProductToInventoryCategory({
      title: name,
      brand,
      remoteCategory,
    }),
    found: Boolean(name),
  };

  setCachedLookup(code, result);
  return result;
}

/*
 * GET /api/barcode/:code
 * Look up a UPC/EAN and return a small inventory-friendly DTO.
 */
router.get(
  "/barcode/:code",
  requireAuthenticatedUser,
  ensureUserProfile,
  familyDataRateLimiter,
  async (req, res) => {
    const code = String(req.params.code || "").trim();

    if (!isValidBarcode(code)) {
      return res.status(400).json({
        error: "Barcode must be 8 to 14 digits.",
        code: "INVALID_BARCODE",
      });
    }

    try {
      const result = await lookupUpc(code);
      return res.json(result);
    } catch (error) {
      const status = error.status || 502;
      return res.status(status).json({
        error:
          status === 429
            ? "Product lookup is temporarily rate limited. Try again shortly."
            : "Could not look up that barcode right now.",
        code: error.code || "BARCODE_LOOKUP_FAILED",
      });
    }
  }
);

export default router;
