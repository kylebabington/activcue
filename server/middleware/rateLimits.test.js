import { describe, expect, it } from "vitest";
import {
  AI_HINTS_RATE_LIMIT,
  AI_SUGGESTIONS_RATE_LIMIT,
  EMAIL_CHECK_RATE_LIMIT,
  FEEDBACK_RATE_LIMIT,
} from "../middleware/rateLimits.js";

describe("rate limit middleware configuration", () => {
  it("limits AI suggestions to 30 per hour", () => {
    expect(AI_SUGGESTIONS_RATE_LIMIT.max).toBe(30);
    expect(AI_SUGGESTIONS_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000);
  });

  it("limits AI hints to 20 per hour", () => {
    expect(AI_HINTS_RATE_LIMIT.max).toBe(20);
    expect(AI_HINTS_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000);
  });

  it("limits email checks more tightly than general auth", () => {
    expect(EMAIL_CHECK_RATE_LIMIT.max).toBe(20);
  });

  it("limits feedback submissions to 5 per 10 minutes", () => {
    expect(FEEDBACK_RATE_LIMIT.max).toBe(5);
    expect(FEEDBACK_RATE_LIMIT.windowMs).toBe(10 * 60 * 1000);
  });

  it("limits family data writes", async () => {
    const { FAMILY_DATA_RATE_LIMIT, PARENT_PIN_RATE_LIMIT } = await import(
      "../middleware/rateLimits.js"
    );
    expect(FAMILY_DATA_RATE_LIMIT.max).toBe(120);
    expect(PARENT_PIN_RATE_LIMIT.max).toBe(20);
  });
});
