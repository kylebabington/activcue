// server/middleware/rateLimits.js

import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const AUTH_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 60 };
export const EMAIL_CHECK_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 20 };
export const AI_SUGGESTIONS_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 30 };
export const AI_HINTS_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 50 };
export const BILLING_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 30 };
export const FAMILY_DATA_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 120 };
export const PARENT_PIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 20 };
export const FEEDBACK_RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };
export const PUBLIC_PRODUCT_EVENTS_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 60,
};

export const authRateLimiter = rateLimit({
  ...AUTH_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many auth requests. Try again in a few minutes.",
    code: "RATE_LIMITED",
  },
});

export const emailCheckRateLimiter = rateLimit({
  ...EMAIL_CHECK_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many email checks. Try again in a few minutes, or try logging in.",
    code: "RATE_LIMITED",
  },
});

function userOrIpKey(req) {
  const userId = req.auth?.userId;
  if (userId) {
    return `user:${userId}`;
  }
  return ipKeyGenerator(req.ip);
}

export const aiSuggestionsRateLimiter = rateLimit({
  ...AI_SUGGESTIONS_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: {
    error: "AI generation limit reached for this hour. Try again later.",
    code: "AI_RATE_LIMITED",
  },
});

export const aiHintsRateLimiter = rateLimit({
  ...AI_HINTS_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: {
    error: "AI hint limit reached for this hour. Try again later.",
    code: "AI_RATE_LIMITED",
  },
});

/** @deprecated Prefer aiSuggestionsRateLimiter / aiHintsRateLimiter */
export const aiRateLimiter = aiSuggestionsRateLimiter;

export const billingRateLimiter = rateLimit({
  ...BILLING_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many billing requests. Try again in a few minutes.",
    code: "RATE_LIMITED",
  },
});

export const familyDataRateLimiter = rateLimit({
  ...FAMILY_DATA_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: {
    error: "Too many family data requests. Try again in a few minutes.",
    code: "RATE_LIMITED",
  },
});

export const parentPinRateLimiter = rateLimit({
  ...PARENT_PIN_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: {
    error: "Too many PIN attempts. Try again in a few minutes.",
    code: "RATE_LIMITED",
  },
});

export const feedbackRateLimiter = rateLimit({
  ...FEEDBACK_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: {
    error: "Too many feedback submissions. Try again in a few minutes.",
    code: "RATE_LIMITED",
  },
});

export const publicProductEventsRateLimiter = rateLimit({
  ...PUBLIC_PRODUCT_EVENTS_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many analytics requests. Try again in a few minutes.",
    code: "RATE_LIMITED",
  },
});
