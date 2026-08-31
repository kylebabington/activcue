import { describe, expect, it } from "vitest";
import {
  shouldRunNarrativeRetry,
  shouldRunAgeFitRetry,
  shouldRunPartialRefill,
  shouldFailAgeFit,
} from "./activitySuggestionsRetryPolicy.js";

describe("shouldRunNarrativeRetry", () => {
  it("runs only when generation produced activities but zero quality survivors", () => {
    expect(
      shouldRunNarrativeRetry({ generatedCount: 3, qualitySurvivorCount: 0 })
    ).toBe(true);
    expect(
      shouldRunNarrativeRetry({ generatedCount: 0, qualitySurvivorCount: 0 })
    ).toBe(false);
    expect(
      shouldRunNarrativeRetry({ generatedCount: 3, qualitySurvivorCount: 1 })
    ).toBe(false);
  });
});

describe("shouldRunAgeFitRetry", () => {
  it("does not run when narrative total failure left zero quality survivors", () => {
    expect(
      shouldRunAgeFitRetry({ qualitySurvivorCount: 0, eligibleCount: 0 })
    ).toBe(false);
  });

  it("runs when quality survivors exist but none pass fit", () => {
    expect(
      shouldRunAgeFitRetry({ qualitySurvivorCount: 3, eligibleCount: 0 })
    ).toBe(true);
  });
});

describe("shouldRunPartialRefill", () => {
  it("does not run after narrative total failure", () => {
    expect(
      shouldRunPartialRefill({
        qualitySurvivorCount: 0,
        eligibleCount: 0,
        aiSlots: 3,
      })
    ).toBe(false);
  });

  it("does not run when age-fit retry produced zero eligible activities", () => {
    expect(
      shouldRunPartialRefill({
        qualitySurvivorCount: 3,
        eligibleCount: 0,
        aiSlots: 3,
        ageRetryAttempted: true,
        ageRetryEligibleCount: 0,
      })
    ).toBe(false);
  });

  it("runs when partial survivors remain after fit filtering", () => {
    expect(
      shouldRunPartialRefill({
        qualitySurvivorCount: 3,
        eligibleCount: 1,
        aiSlots: 3,
      })
    ).toBe(true);
  });

  it("runs when age-fit retry produced some but not enough eligible", () => {
    expect(
      shouldRunPartialRefill({
        qualitySurvivorCount: 3,
        eligibleCount: 1,
        aiSlots: 3,
        ageRetryAttempted: true,
        ageRetryEligibleCount: 1,
      })
    ).toBe(true);
  });
});

describe("shouldFailAgeFit", () => {
  it("returns false for narrative total failure so legacy fallback can run", () => {
    expect(
      shouldFailAgeFit({
        qualitySurvivorCount: 0,
        eligibleCount: 0,
        cachedKeptCount: 0,
      })
    ).toBe(false);
  });

  it("returns true when quality survivors failed fit with no cache backup", () => {
    expect(
      shouldFailAgeFit({
        qualitySurvivorCount: 2,
        eligibleCount: 0,
        cachedKeptCount: 0,
      })
    ).toBe(true);
  });
});
