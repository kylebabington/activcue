// src/api/billingApi.js

import {
  ApiRequestError,
  authenticatedRequest,
} from "./apiClient";

/*
 * These are the only plan names accepted by the FamilyFlow backend.
 *
 * The browser sends the plan name—not the actual Stripe Price ID.
 * The Express server safely maps the plan to the trusted Price ID stored
 * in server/.env.
 */
const VALID_BILLING_PLANS = new Set([
  "monthly",
  "annual",
]);

/*
 * Ask the Express server to create a Stripe-hosted Checkout Session.
 *
 * Usage:
 *
 * createCheckoutSession("monthly", {
 *   expectedUserId: user.id,
 * });
 *
 * or:
 *
 * createCheckoutSession("annual", {
 *   expectedUserId: user.id,
 * });
 */
export async function createCheckoutSession(
  plan,
  {
    expectedUserId,
  } = {}
) {
  /*
   * Catch programming errors in the browser before sending a request.
   */
  if (!VALID_BILLING_PLANS.has(plan)) {
    throw new ApiRequestError(
      "Choose either the monthly or annual FamilyFlow Plus plan.",
      {
        status: 400,
        code: "INVALID_BILLING_PLAN",
      }
    );
  }

  const response =
    await authenticatedRequest(
      "/api/billing/create-checkout-session",
      {
        method: "POST",

        /*
         * authenticatedRequest verifies that this is still the same Supabase
         * user who clicked the Checkout button.
         */
        expectedUserId,

        /*
         * This body lets the server select either the monthly or annual
         * Stripe Price ID.
         */
        body: JSON.stringify({
          plan,
        }),
      }
    );

  const payload = await response.json();

  /*
   * Never redirect unless the server returned a usable hosted Checkout URL.
   */
  if (
    !payload ||
    typeof payload.url !== "string" ||
    !payload.url
  ) {
    throw new ApiRequestError(
      "Stripe Checkout did not return a usable payment URL.",
      {
        status: 502,
        code: "CHECKOUT_URL_MISSING",
      }
    );
  }

  return payload;
}

/*
 * Create a Checkout Session and send the browser to Stripe's hosted page.
 *
 * Defaults to the monthly plan. Call sites that already know the signed-in
 * user should pass expectedUserId so the request fails if the session changes.
 */
export async function redirectToCheckout({
  plan = "monthly",
  expectedUserId,
} = {}) {
  const checkout = await createCheckoutSession(plan, {
    expectedUserId,
  });

  window.location.assign(checkout.url);
}