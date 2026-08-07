// src/api/billingApi.js

import {
  ApiRequestError,
  authenticatedRequest,
  publicRequest,
} from "./apiClient";

/*
 * These are the only plan names accepted by the ActivCue backend.
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
 * Load display amounts for monthly/annual from Stripe via the ActivCue API.
 */
export async function getBillingPlans() {
  const response = await publicRequest("/api/billing/plans", {
    method: "GET",
  });
  const payload = await response.json();
  const plans = Array.isArray(payload?.plans) ? payload.plans : [];

  if (plans.length === 0) {
    throw new ApiRequestError(
      "Subscription prices are unavailable right now.",
      {
        status: 502,
        code: "PLANS_UNAVAILABLE",
      }
    );
  }

  return {
    plans,
    byPlan: Object.fromEntries(
      plans
        .filter((plan) => plan && typeof plan.plan === "string")
        .map((plan) => [plan.plan, plan])
    ),
  };
}

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
      "Choose either the monthly or annual ActivCue Plus plan.",
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

/*
 * Call one of ActivCue's authenticated subscription-management endpoints.
 *
 * The browser never sends a Stripe customer ID or subscription ID.
 * The Express server finds the correct subscription using the authenticated
 * Supabase user.
 */
async function updateSubscriptionRenewal(
  path,
  {
    expectedUserId,
  } = {}
) {
  const response =
    await authenticatedRequest(
      path,
      {
        method: "POST",
        expectedUserId,
      }
    );

  const payload =
    await response.json();

  /*
   * Both management endpoints should return the latest server-trusted
   * entitlement.
   */
  if (
    !payload ||
    typeof payload !== "object" ||
    !payload.entitlement ||
    typeof payload.entitlement !==
    "object"
  ) {
    throw new ApiRequestError(
      "The subscription was updated, but ActivCue did not return its latest billing status.",
      {
        status: 502,
        code:
          "SUBSCRIPTION_ENTITLEMENT_MISSING",
      }
    );
  }

  return payload;
}

/*
 * Stop automatic renewal after the current paid billing period.
 *
 * Paid access remains active until currentPeriodEnd.
 */
export async function cancelSubscription({
  expectedUserId,
} = {}) {
  return updateSubscriptionRenewal(
    "/api/billing/cancel-subscription",
    {
      expectedUserId,
    }
  );
}

/*
 * Remove a scheduled end-of-period cancellation.
 *
 * This works only before the Stripe subscription has fully ended.
 */
export async function resumeSubscription({
  expectedUserId,
} = {}) {
  return updateSubscriptionRenewal(
    "/api/billing/resume-subscription",
    {
      expectedUserId,
    }
  );
}
