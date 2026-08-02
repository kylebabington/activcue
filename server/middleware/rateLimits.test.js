import { describe, expect, it } from "vitest";
import {
  AI_HINTS_RATE_LIMIT,
  AI_SUGGESTIONS_RATE_LIMIT,
  EMAIL_CHECK_RATE_LIMIT,
} from "../middleware/rateLimits.js";

describe("rate limit middleware configuration", () => {
  it("limits AI suggestions to 30 per hour", () => {
    expect(AI_SUGGESTIONS_RATE_LIMIT.max).toBe(30);
    expect(AI_SUGGESTIONS_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000);
  });

  it("limits AI hints to 50 per hour", () => {
    expect(AI_HINTS_RATE_LIMIT.max).toBe(50);
    expect(AI_HINTS_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000);
  });

  it("limits email checks more tightly than general auth", () => {
    expect(EMAIL_CHECK_RATE_LIMIT.max).toBe(20);
  });
});
