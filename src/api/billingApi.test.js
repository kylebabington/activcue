import { describe, expect, it } from "vitest";

import {
  formatStripeAmount,
  intervalLabelForPlan,
} from "./billingApi.js";

describe("formatStripeAmount", () => {
  it("formats Stripe unit amounts as currency", () => {
    expect(formatStripeAmount(299, "usd")).toMatch(/2\.99/);
    expect(formatStripeAmount(1999, "usd")).toMatch(/19\.99/);
  });

  it("returns empty string for invalid amounts", () => {
    expect(formatStripeAmount(NaN, "usd")).toBe("");
    expect(formatStripeAmount(undefined, "usd")).toBe("");
  });
});

describe("intervalLabelForPlan", () => {
  it("maps common intervals", () => {
    expect(intervalLabelForPlan("month")).toBe("per month");
    expect(intervalLabelForPlan("year")).toBe("per year");
  });
});
