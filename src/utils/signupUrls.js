// src/utils/signupUrls.js

const VALID_CHECKOUT_PLANS = new Set(["monthly", "annual"]);
export const DEMO_UNLOCK_INTENT_KEY = "familyflow.demo.unlockIntent";

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

/**
 * Signup link from the public demo unlock CTA.
 * Stores the chosen activity so post-signup flows can prefer it.
 */
export function buildDemoUnlockSignupUrl(activity = null) {
  try {
    window.sessionStorage.setItem(
      DEMO_UNLOCK_INTENT_KEY,
      JSON.stringify({
        slug: activity?.slug || null,
        title: activity?.title || null,
        activityStyle: activity?.activityStyle || null,
        at: Date.now(),
      })
    );
  } catch {
    // sessionStorage is best-effort
  }

  const params = new URLSearchParams({ from: "demo" });
  if (activity?.slug) {
    params.set("activity", activity.slug);
  }
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
