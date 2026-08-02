import { describe, expect, it } from "vitest";

import {
  getAppBaseUrl,
  getCheckoutConflict,
  getPriceIdForPlan,
  isBlockingSubscriptionStatus,
  isValidBillingPlan,
} from "./billingHelpers.js";

describe("isBlockingSubscriptionStatus", () => {
  it.each([
    "incomplete",
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "paused",
  ])("blocks checkout for %s", (status) => {
    expect(isBlockingSubscriptionStatus(status)).toBe(true);
  });

  it.each([
    "canceled",
    "incomplete_expired",
    "inactive",
  ])("does not block checkout for %s", (status) => {
    expect(isBlockingSubscriptionStatus(status)).toBe(false);
  });

  it("documents past_due as unpaid in entitlements but blocking for checkout", () => {
    expect(isBlockingSubscriptionStatus("past_due")).toBe(true);
  });
});

describe("isValidBillingPlan / getPriceIdForPlan", () => {
  it("accepts monthly and annual only", () => {
    expect(isValidBillingPlan("monthly")).toBe(true);
    expect(isValidBillingPlan("annual")).toBe(true);
    expect(isValidBillingPlan("weekly")).toBe(false);
    expect(isValidBillingPlan("")).toBe(false);
  });

  it("reads price ids from the provided env map", () => {
    const env = {
      STRIPE_MONTHLY_PRICE_ID: "price_month",
      STRIPE_ANNUAL_PRICE_ID: "price_year",
    };

    expect(getPriceIdForPlan("monthly", env)).toBe("price_month");
    expect(getPriceIdForPlan("annual", env)).toBe("price_year");
    expect(getPriceIdForPlan("weekly", env)).toBeNull();
    expect(getPriceIdForPlan("monthly", {})).toBeNull();
  });
});

describe("getAppBaseUrl", () => {
  it("uses APP_URL when configured and strips trailing slashes", () => {
    expect(
      getAppBaseUrl({
        APP_URL: "https://app.example.com/",
        NODE_ENV: "production",
      })
    ).toBe("https://app.example.com");
  });

  it("falls back to local vite in non-production when APP_URL is missing", () => {
    expect(
      getAppBaseUrl({
        APP_URL: "  ",
        NODE_ENV: "development",
      })
    ).toBe("http://localhost:5173");
  });

  it("returns empty string in production without APP_URL", () => {
    expect(
      getAppBaseUrl({
        APP_URL: "",
        NODE_ENV: "production",
      })
    ).toBe("");
  });
});

describe("getCheckoutConflict", () => {
  it("returns BILLING_EXEMPT_ACCOUNT before paid checks", () => {
    expect(
      getCheckoutConflict({
        entitlement: {
          billingExempt: true,
          isPaid: false,
        },
        blockingSubscription: { id: "sub_blocking" },
      })
    ).toMatchObject({
      status: 409,
      code: "BILLING_EXEMPT_ACCOUNT",
      error: "FamilyFlow Plus is included with this account.",
    });
  });

  it("returns ALREADY_SUBSCRIBED when local entitlement is paid", () => {
    expect(
      getCheckoutConflict({
        entitlement: { isPaid: true },
        blockingSubscription: { id: "sub_blocking" },
      })
    ).toMatchObject({
      status: 409,
      code: "ALREADY_SUBSCRIBED",
    });
  });

  it("returns ALREADY_SUBSCRIBED for canceled-with-grace (paid locally)", () => {
    expect(
      getCheckoutConflict({
        entitlement: {
          isPaid: true,
          subscriptionStatus: "canceled",
        },
        blockingSubscription: null,
      })
    ).toMatchObject({
      code: "ALREADY_SUBSCRIBED",
    });
  });

  it("returns EXISTING_SUBSCRIPTION_REQUIRES_PORTAL for Stripe blocking + unpaid local", () => {
    expect(
      getCheckoutConflict({
        entitlement: { isPaid: false },
        blockingSubscription: {
          id: "sub_past_due",
          status: "past_due",
        },
      })
    ).toMatchObject({
      status: 409,
      code: "EXISTING_SUBSCRIPTION_REQUIRES_PORTAL",
    });
  });

  it("returns null when checkout may proceed", () => {
    expect(
      getCheckoutConflict({
        entitlement: { isPaid: false, billingExempt: false },
        blockingSubscription: null,
      })
    ).toBeNull();
  });
});
