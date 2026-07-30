// src/api/billingApi.js

import { authenticatedRequest } from "./apiClient";

/*
 * Create a Managed Payments Checkout Session and return the hosted URL.
 *
 * plan must be "monthly" or "annual" (server validates; never send a Price ID).
 */
export async function createCheckoutSession(
  plan,
  { expectedUserId } = {}
) {
  const response = await authenticatedRequest(
    "/api/billing/create-checkout-session",
    {
      method: "POST",
      body: JSON.stringify({ plan }),
      expectedUserId,
    }
  );

  return response.json();
}

/*
 * Start hosted Checkout. Redirects the browser to Stripe on success.
 */
export async function redirectToCheckout(
  plan = "monthly"
) {
  const payload = await createCheckoutSession(plan);

  if (!payload?.url) {
    throw new Error("Checkout did not return a redirect URL.");
  }

  window.location.assign(payload.url);
}
