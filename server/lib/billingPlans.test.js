import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BILLING_PLANS_CACHE_TTL_MS,
  clearBillingPlansCache,
  getBillingPlans,
  mapStripePriceToPlan,
} from "./billingPlans.js";

afterEach(() => {
  clearBillingPlansCache();
});

describe("mapStripePriceToPlan", () => {
  it("maps a recurring Stripe Price into the public plan shape", () => {
    expect(
      mapStripePriceToPlan("monthly", {
        id: "price_month",
        unit_amount: 299,
        currency: "USD",
        recurring: { interval: "month", interval_count: 1 },
      })
    ).toEqual({
      plan: "monthly",
      priceId: "price_month",
      unitAmount: 299,
      currency: "usd",
      interval: "month",
      intervalCount: 1,
    });
  });

  it("rejects prices missing amount or recurring interval", () => {
    expect(
      mapStripePriceToPlan("monthly", {
        id: "price_month",
        unit_amount: 299,
        currency: "usd",
      })
    ).toBeNull();

    expect(
      mapStripePriceToPlan("annual", {
        id: "price_year",
        currency: "usd",
        recurring: { interval: "year", interval_count: 1 },
      })
    ).toBeNull();
  });
});

describe("getBillingPlans", () => {
  const env = {
    STRIPE_MONTHLY_PRICE_ID: "price_month",
    STRIPE_ANNUAL_PRICE_ID: "price_year",
  };

  function mockStripeRetrieve(pairs) {
    const retrieve = vi.fn();
    for (const price of pairs) {
      retrieve.mockResolvedValueOnce(price);
    }
    return { prices: { retrieve }, retrieve };
  }

  it("retrieves monthly and annual prices from Stripe and caches them", async () => {
    const { prices, retrieve } = mockStripeRetrieve([
      {
        id: "price_month",
        unit_amount: 299,
        currency: "usd",
        recurring: { interval: "month", interval_count: 1 },
      },
      {
        id: "price_year",
        unit_amount: 1999,
        currency: "usd",
        recurring: { interval: "year", interval_count: 1 },
      },
    ]);

    const first = await getBillingPlans({
      env,
      stripe: { prices },
      nowMs: 1_000,
    });

    expect(first).toEqual([
      {
        plan: "monthly",
        priceId: "price_month",
        unitAmount: 299,
        currency: "usd",
        interval: "month",
        intervalCount: 1,
      },
      {
        plan: "annual",
        priceId: "price_year",
        unitAmount: 1999,
        currency: "usd",
        interval: "year",
        intervalCount: 1,
      },
    ]);
    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(retrieve).toHaveBeenNthCalledWith(1, "price_month");
    expect(retrieve).toHaveBeenNthCalledWith(2, "price_year");

    const second = await getBillingPlans({
      env,
      stripe: { prices },
      nowMs: 1_000 + BILLING_PLANS_CACHE_TTL_MS - 1,
    });

    expect(second).toEqual(first);
    expect(retrieve).toHaveBeenCalledTimes(2);
  });

  it("refetches after the cache TTL expires", async () => {
    const { prices, retrieve } = mockStripeRetrieve([
      {
        id: "price_month",
        unit_amount: 299,
        currency: "usd",
        recurring: { interval: "month", interval_count: 1 },
      },
      {
        id: "price_year",
        unit_amount: 1999,
        currency: "usd",
        recurring: { interval: "year", interval_count: 1 },
      },
      {
        id: "price_month",
        unit_amount: 399,
        currency: "usd",
        recurring: { interval: "month", interval_count: 1 },
      },
      {
        id: "price_year",
        unit_amount: 2999,
        currency: "usd",
        recurring: { interval: "year", interval_count: 1 },
      },
    ]);

    await getBillingPlans({ env, stripe: { prices }, nowMs: 0 });
    expect(retrieve).toHaveBeenCalledTimes(2);

    const refreshed = await getBillingPlans({
      env,
      stripe: { prices },
      nowMs: BILLING_PLANS_CACHE_TTL_MS + 1,
    });

    expect(retrieve).toHaveBeenCalledTimes(4);
    expect(refreshed[0].unitAmount).toBe(399);
    expect(refreshed[1].unitAmount).toBe(2999);
  });

  it("throws STRIPE_NOT_CONFIGURED when a price id env var is missing", async () => {
    await expect(
      getBillingPlans({
        env: { STRIPE_MONTHLY_PRICE_ID: "price_month" },
        stripe: { prices: { retrieve: vi.fn() } },
        bypassCache: true,
      })
    ).rejects.toMatchObject({ code: "STRIPE_NOT_CONFIGURED" });
  });
});
