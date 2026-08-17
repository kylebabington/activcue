import { describe, expect, it } from "vitest";
import { GROWTH_FUNNEL_STEPS } from "./adminGrowth.js";

describe("GROWTH_FUNNEL_STEPS", () => {
  it("labels the last funnel step as Subscription started", () => {
    const last = GROWTH_FUNNEL_STEPS[GROWTH_FUNNEL_STEPS.length - 1];
    expect(last.id).toBe("subscription_purchased");
    expect(last.label).toBe("Subscription started");
    expect(last.eventName).toBe("subscription_started");
  });
});
