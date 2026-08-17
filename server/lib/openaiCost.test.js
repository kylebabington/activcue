import { describe, expect, it } from "vitest";
import {
  classifyAiFailureType,
  estimateOpenAiCost,
  getOpenAiModelRates,
} from "../../server/lib/openaiCost.js";

describe("estimateOpenAiCost", () => {
  it("estimates cost for gpt-4o-mini from token counts", () => {
    const cost = estimateOpenAiCost({
      model: "gpt-4o-mini",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });

    expect(cost).toBe(0.75);
  });

  it("returns 0 when both token counts are zero", () => {
    expect(
      estimateOpenAiCost({
        model: "gpt-5.4-mini",
        inputTokens: 0,
        outputTokens: 0,
      })
    ).toBe(0);
  });

  it("returns null for invalid token values", () => {
    expect(
      estimateOpenAiCost({
        model: "gpt-4o",
        inputTokens: Number.NaN,
        outputTokens: 10,
      })
    ).toBeNull();
  });
});

describe("getOpenAiModelRates", () => {
  it("falls back to default rates for unknown models", () => {
    const rates = getOpenAiModelRates("totally-unknown-model");
    expect(rates.input).toBeGreaterThan(0);
    expect(rates.output).toBeGreaterThan(0);
  });
});

describe("classifyAiFailureType", () => {
  it("classifies rate limits and auth failures", () => {
    expect(classifyAiFailureType({ status: 429 })).toBe("rate_limit");
    expect(classifyAiFailureType({ status: 401, code: "invalid_api_key" })).toBe(
      "auth"
    );
    expect(classifyAiFailureType({ status: 500 })).toBe("server_error");
    expect(classifyAiFailureType(null)).toBe("unknown");
  });

  it("classifies insufficient_quota before generic 429 rate limits", () => {
    expect(
      classifyAiFailureType({
        status: 429,
        code: "insufficient_quota",
        message: "You exceeded your current quota, please check your plan and billing details.",
      })
    ).toBe("quota");
    expect(
      classifyAiFailureType({
        status: 429,
        error: { code: "insufficient_quota", type: "insufficient_quota" },
      })
    ).toBe("quota");
  });
});
