// src/utils/signupUrls.js

const VALID_CHECKOUT_PLANS = new Set(["monthly", "annual"]);

/*
 * Build the /signup URL, optionally carrying Plus checkout intent through
 * anonymous-to-permanent conversion.
 */
export function buildSignupUrl({
  next = null,
  plan = "monthly",
} = {}) {
  if (next !== "checkout") {
    return "/signup";
  }

  const normalizedPlan = VALID_CHECKOUT_PLANS.has(plan)
    ? plan
    : "monthly";

  const params = new URLSearchParams({
    next: "checkout",
    plan: normalizedPlan,
  });

  return `/signup?${params.toString()}`;
}

export function parseSignupCheckoutIntent(search) {
  const params = new URLSearchParams(search || "");
  const next = params.get("next");
  const plan = params.get("plan") || "monthly";

  if (next !== "checkout") {
    return {
      shouldCheckout: false,
      plan: "monthly",
    };
  }

  return {
    shouldCheckout: true,
    plan: VALID_CHECKOUT_PLANS.has(plan) ? plan : "monthly",
  };
}
