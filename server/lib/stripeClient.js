// server/lib/stripeClient.js

import Stripe from "stripe";

/*
 * Blueprint Managed Payments requests require this Stripe-Version header.
 * Leave the Stripe constructor apiVersion unset; pass this only on those calls.
 */
export const STRIPE_MANAGED_PAYMENTS_VERSION =
  "2026-02-25.preview";

export const managedPaymentsRequestOptions = {
  apiVersion: STRIPE_MANAGED_PAYMENTS_VERSION,
};

let stripeLiveClient = null;
let stripeTestClient = null;

/*
 * Lazily create the live Stripe SDK client (STRIPE_SECRET_KEY).
 *
 * Stripe env vars are optional at server boot for some scripts; billing routes
 * return 503 when STRIPE_SECRET_KEY is missing at request time. Production
 * server boot still requires STRIPE_SECRET_KEY.
 */
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  if (!stripeLiveClient) {
    stripeLiveClient = new Stripe(secretKey);
  }

  return stripeLiveClient;
}

/*
 * Optional sandbox / test-mode Stripe client (STRIPE_SECRET_KEY_TEST).
 * Missing in production is fine until a verified livemode:false webhook arrives.
 */
export function getStripeTestClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY_TEST;

  if (!secretKey) {
    return null;
  }

  if (!stripeTestClient) {
    stripeTestClient = new Stripe(secretKey);
  }

  return stripeTestClient;
}

/**
 * After webhook signature verification, select the API client for event.livemode.
 * Never call this with unverified request-body fields.
 *
 * @param {boolean} livemode
 * @returns {{
 *   ok: true,
 *   stripe: import("stripe").default,
 *   mode: "live" | "test",
 * } | {
 *   ok: false,
 *   reason: "missing-live-secret-key" | "missing-test-secret-key" | "invalid-livemode",
 *   mode: "live" | "test" | null,
 * }}
 */
export function getStripeClientForLivemode(livemode) {
  if (livemode === true) {
    const stripe = getStripeClient();
    if (!stripe) {
      return {
        ok: false,
        reason: "missing-live-secret-key",
        mode: "live",
      };
    }
    return { ok: true, stripe, mode: "live" };
  }

  if (livemode === false) {
    const stripe = getStripeTestClient();
    if (!stripe) {
      return {
        ok: false,
        reason: "missing-test-secret-key",
        mode: "test",
      };
    }
    return { ok: true, stripe, mode: "test" };
  }

  return {
    ok: false,
    reason: "invalid-livemode",
    mode: null,
  };
}

export function requireStripeClient() {
  const stripe = getStripeClient();

  if (!stripe) {
    const error = new Error(
      "STRIPE_SECRET_KEY is not configured."
    );
    error.code = "STRIPE_NOT_CONFIGURED";
    throw error;
  }

  return stripe;
}

/** @internal test helper — resets cached clients between tests. */
export function __resetStripeClientsForTests() {
  stripeLiveClient = null;
  stripeTestClient = null;
}
