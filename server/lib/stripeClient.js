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

let stripeClient = null;

/*
 * Lazily create the Stripe SDK client.
 *
 * Stripe env vars are optional at server boot; billing routes return 503 when
 * STRIPE_SECRET_KEY is missing at request time.
 */
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
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
