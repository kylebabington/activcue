// server/lib/billingPlans.js

import {
  PLAN_PRICE_ENVIRONMENT_VARIABLES,
  getPriceIdForPlan,
} from "./billingHelpers.js";
import { requireStripeClient } from "./stripeClient.js";

export const BILLING_PLANS_CACHE_TTL_MS = 5 * 60 * 1000;

const PLAN_ORDER = Object.keys(PLAN_PRICE_ENVIRONMENT_VARIABLES);

let cachedPlans = null;
let cachedAtMs = 0;

/*
 * Map a Stripe Price object into the public billing-plans payload shape.
 */
export function mapStripePriceToPlan(plan, price) {
  if (!price || typeof price !== "object") {
    return null;
  }

  const unitAmount = Number(price.unit_amount);
  if (!Number.isFinite(unitAmount) || unitAmount < 0) {
    return null;
  }

  const currency =
    typeof price.currency === "string" && price.currency.trim()
      ? price.currency.trim().toLowerCase()
      : null;
  if (!currency) {
    return null;
  }

  const recurring =
    price.recurring && typeof price.recurring === "object"
      ? price.recurring
      : null;
  const interval =
    typeof recurring?.interval === "string" && recurring.interval.trim()
      ? recurring.interval.trim().toLowerCase()
      : null;
  if (!interval) {
    return null;
  }

  const intervalCount = Number(recurring?.interval_count);
  const resolvedIntervalCount =
    Number.isFinite(intervalCount) && intervalCount > 0
      ? Math.round(intervalCount)
      : 1;

  return {
    plan,
    priceId: typeof price.id === "string" ? price.id : null,
    unitAmount: Math.round(unitAmount),
    currency,
    interval,
    intervalCount: resolvedIntervalCount,
  };
}

export function clearBillingPlansCache() {
  cachedPlans = null;
  cachedAtMs = 0;
}

function getCachedPlans(nowMs = Date.now()) {
  if (!cachedPlans) {
    return null;
  }
  if (nowMs - cachedAtMs > BILLING_PLANS_CACHE_TTL_MS) {
    return null;
  }
  return cachedPlans;
}

function setCachedPlans(plans, nowMs = Date.now()) {
  cachedPlans = plans;
  cachedAtMs = nowMs;
}

/*
 * Load monthly + annual display amounts from Stripe Price objects.
 * Uses STRIPE_*_PRICE_ID env vars; never accepts client-supplied price IDs.
 */
export async function getBillingPlans({
  env = process.env,
  stripe = null,
  nowMs = Date.now(),
  bypassCache = false,
} = {}) {
  if (!bypassCache) {
    const cached = getCachedPlans(nowMs);
    if (cached) {
      return cached;
    }
  }

  const client = stripe || requireStripeClient();

  const plans = await Promise.all(
    PLAN_ORDER.map(async (plan) => {
      const priceId = getPriceIdForPlan(plan, env);
      if (!priceId) {
        const error = new Error(
          `Missing Stripe Price ID for plan "${plan}".`
        );
        error.code = "STRIPE_NOT_CONFIGURED";
        throw error;
      }

      const price = await client.prices.retrieve(priceId);
      const mapped = mapStripePriceToPlan(plan, price);
      if (!mapped) {
        const error = new Error(
          `Stripe Price "${priceId}" is missing amount or recurring interval.`
        );
        error.code = "PLANS_UNAVAILABLE";
        throw error;
      }
      return mapped;
    })
  );

  setCachedPlans(plans, nowMs);
  return plans;
}
