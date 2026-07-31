// server/lib/billingHelpers.js

/*
 * The browser sends only "monthly" or "annual".
 *
 * The browser must never send an arbitrary Stripe Price ID.
 */
export const PLAN_PRICE_ENVIRONMENT_VARIABLES = {
  monthly: "STRIPE_MONTHLY_PRICE_ID",
  annual: "STRIPE_ANNUAL_PRICE_ID",
};

/*
 * These Stripe statuses indicate that another subscription Checkout should
 * not be created for the same Stripe customer.
 */
export const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "paused",
]);

export function isBlockingSubscriptionStatus(status) {
  return BLOCKING_SUBSCRIPTION_STATUSES.has(status);
}

export function isValidBillingPlan(plan) {
  return Object.hasOwn(PLAN_PRICE_ENVIRONMENT_VARIABLES, plan);
}

export function getAppBaseUrl(env = process.env) {
  const configured = (env.APP_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (configured) {
    return configured;
  }

  if (env.NODE_ENV !== "production") {
    return "http://localhost:5173";
  }

  return "";
}

export function getPriceIdForPlan(plan, env = process.env) {
  const environmentVariableName =
    PLAN_PRICE_ENVIRONMENT_VARIABLES[plan];

  if (!environmentVariableName) {
    return null;
  }

  return env[environmentVariableName] || null;
}

/*
 * Decide whether Checkout should be refused before talking to Stripe Sessions.
 *
 * Local paid access (including canceled-with-grace) wins first. A Stripe-side
 * blocking subscription then catches webhook lag / past_due lockout cases.
 */
export function getCheckoutConflict({
  entitlement,
  blockingSubscription,
}) {
  if (entitlement?.isPaid) {
    return {
      status: 409,
      error: "This account already has FamilyFlow Plus.",
      code: "ALREADY_SUBSCRIBED",
    };
  }

  if (blockingSubscription) {
    return {
      status: 409,
      error:
        "This Stripe customer already has a subscription that must be managed through billing settings.",
      code: "EXISTING_SUBSCRIPTION_REQUIRES_PORTAL",
    };
  }

  return null;
}

export async function findBlockingSubscription(stripe, customerId) {
  if (!customerId) {
    return null;
  }

  const subscriptionList = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  return (
    subscriptionList.data.find((subscription) =>
      isBlockingSubscriptionStatus(subscription.status)
    ) || null
  );
}
