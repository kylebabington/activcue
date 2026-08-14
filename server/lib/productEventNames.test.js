import { describe, expect, it } from "vitest";
import {
  PRODUCT_EVENT_NAMES,
  PRODUCT_EVENT_NAME_SET,
} from "../../server/lib/productEventNames.js";

describe("product event allowlist", () => {
  it("includes the core launch funnel events", () => {
    expect(PRODUCT_EVENT_NAME_SET.has("landing_page_viewed")).toBe(true);
    expect(PRODUCT_EVENT_NAME_SET.has("demo_completed")).toBe(true);
    expect(PRODUCT_EVENT_NAME_SET.has("first_activity_generated")).toBe(true);
    expect(PRODUCT_EVENT_NAME_SET.has("activity_generated")).toBe(true);
    expect(PRODUCT_EVENT_NAME_SET.has("plus_checkout_succeeded")).toBe(true);
    expect(PRODUCT_EVENT_NAME_SET.has("not_a_real_event")).toBe(false);
  });

  it("is a frozen sparse list", () => {
    expect(PRODUCT_EVENT_NAMES.length).toBeGreaterThan(10);
    expect(Object.isFrozen(PRODUCT_EVENT_NAMES)).toBe(true);
  });
});
