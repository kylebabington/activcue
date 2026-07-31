import { describe, expect, it } from "vitest";

import {
  getSubscriptionPeriodEnd,
  getSubscriptionPriceId,
  normalizeSubscriptionStatus,
} from "./subscriptionStore.js";

describe("normalizeSubscriptionStatus", () => {
  it.each([
    "inactive",
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
  ])("passes through valid status %s", (status) => {
    expect(normalizeSubscriptionStatus(status)).toBe(status);
  });

  it.each([
    [undefined, "inactive"],
    [null, "inactive"],
    ["", "inactive"],
    ["unknown", "inactive"],
    ["ACTIVE", "inactive"],
    [123, "inactive"],
  ])("coerces %s to inactive", (status, expected) => {
    expect(normalizeSubscriptionStatus(status)).toBe(expected);
  });
});

describe("getSubscriptionPeriodEnd", () => {
  it("returns null for missing or non-object input", () => {
    expect(getSubscriptionPeriodEnd(null)).toBeNull();
    expect(getSubscriptionPeriodEnd(undefined)).toBeNull();
    expect(getSubscriptionPeriodEnd("sub")).toBeNull();
  });

  it("prefers the latest item-level current_period_end", () => {
    expect(
      getSubscriptionPeriodEnd({
        current_period_end: 1_700_000_000,
        items: {
          data: [
            { current_period_end: 1_710_000_000 },
            { current_period_end: 1_720_000_000 },
          ],
        },
      })
    ).toBe(new Date(1_720_000_000 * 1000).toISOString());
  });

  it("falls back to top-level current_period_end for older payloads", () => {
    expect(
      getSubscriptionPeriodEnd({
        current_period_end: 1_700_000_000,
        items: { data: [] },
      })
    ).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it("ignores non-finite item period ends and falls back", () => {
    expect(
      getSubscriptionPeriodEnd({
        current_period_end: 1_700_000_000,
        items: {
          data: [
            { current_period_end: "bad" },
            { current_period_end: undefined },
          ],
        },
      })
    ).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it("treats Number(null) item ends as epoch seconds (0)", () => {
    expect(
      getSubscriptionPeriodEnd({
        current_period_end: 1_700_000_000,
        items: {
          data: [{ current_period_end: null }],
        },
      })
    ).toBe(new Date(0).toISOString());
  });

  it("returns null when no usable period end exists", () => {
    expect(
      getSubscriptionPeriodEnd({
        items: { data: [{ current_period_end: "nope" }] },
      })
    ).toBeNull();
  });
});

describe("getSubscriptionPriceId", () => {
  it("returns a string price id", () => {
    expect(
      getSubscriptionPriceId({
        items: {
          data: [{ price: "price_abc" }],
        },
      })
    ).toBe("price_abc");
  });

  it("returns an expanded price object id", () => {
    expect(
      getSubscriptionPriceId({
        items: {
          data: [{ price: { id: "price_expanded" } }],
        },
      })
    ).toBe("price_expanded");
  });

  it("returns null when price data is missing", () => {
    expect(getSubscriptionPriceId(null)).toBeNull();
    expect(getSubscriptionPriceId({})).toBeNull();
    expect(
      getSubscriptionPriceId({
        items: { data: [{ price: {} }] },
      })
    ).toBeNull();
  });
});
