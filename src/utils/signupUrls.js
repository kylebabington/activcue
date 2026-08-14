// src/utils/signupUrls.js

const VALID_CHECKOUT_PLANS = new Set(["monthly", "annual"]);
export const DEMO_UNLOCK_INTENT_KEY = "activcue.demo.unlockIntent";
export const DEMO_ACTIVITY_HANDOFF_KEY = "activcue.demo.activityHandoff";

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

export function readDemoUnlockIntent() {
  try {
    const raw = window.sessionStorage.getItem(DEMO_UNLOCK_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDemoUnlockIntent() {
  try {
    window.sessionStorage.removeItem(DEMO_UNLOCK_INTENT_KEY);
  } catch {
    // ignore
  }
}

/**
 * One-shot handoff so App/onboarding can open the demo activity after signup.
 */
export function writeDemoActivityHandoff({ slug = null, title = null } = {}) {
  if (!slug) return;
  try {
    window.sessionStorage.setItem(
      DEMO_ACTIVITY_HANDOFF_KEY,
      JSON.stringify({ slug, title, at: Date.now() })
    );
  } catch {
    // ignore
  }
}

export function readDemoActivityHandoff() {
  try {
    const raw = window.sessionStorage.getItem(DEMO_ACTIVITY_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDemoActivityHandoff() {
  try {
    window.sessionStorage.removeItem(DEMO_ACTIVITY_HANDOFF_KEY);
  } catch {
    // ignore
  }
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

const BLOCKED_REDIRECT_PATHS = new Set([
  "/signup",
  "/login",
  "/complete-signup",
  "/forgot-password",
  "/reset-password",
]);

/**
 * Safe post-signup in-app redirect from ?redirect=.
 * Only same-origin relative paths are allowed.
 */
export function parseSafeAppRedirect(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep the raw value if it was not encoded.
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (value.includes("://") || value.includes("\\")) {
    return null;
  }

  const pathOnly = value.split("?")[0].split("#")[0] || "/";
  if (BLOCKED_REDIRECT_PATHS.has(pathOnly)) {
    return null;
  }

  return value;
}
