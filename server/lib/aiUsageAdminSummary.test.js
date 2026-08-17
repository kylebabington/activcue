import { describe, expect, it } from "vitest";
import { buildAiUsageAdminSummary } from "./aiUsageAdminSummary.js";

describe("buildAiUsageAdminSummary", () => {
  it("sums successful estimated cost and splits counts by operation", () => {
    const summary = buildAiUsageAdminSummary([
      {
        operation: "activity-suggestions",
        success: true,
        estimated_cost: 0.012,
      },
      {
        operation: "activity-suggestions",
        success: true,
        estimated_cost: 0.008,
      },
      {
        operation: "quest-step-hint",
        success: true,
        estimated_cost: 0.001,
      },
      {
        operation: "activity-suggestions",
        success: false,
        failure_type: "quota",
      },
      {
        operation: "quest-step-hint",
        success: false,
        failure_type: "rate_limit",
      },
    ]);

    expect(summary).toEqual({
      estimatedCost: 0.021,
      successCount: 3,
      failureCount: 2,
      callCount: 5,
      byOperation: {
        "activity-suggestions": {
          success: 2,
          failure: 1,
          estimatedCost: 0.02,
        },
        "quest-step-hint": {
          success: 1,
          failure: 1,
          estimatedCost: 0.001,
        },
      },
      byFailureType: {
        quota: 1,
        rate_limit: 1,
      },
    });
  });

  it("ignores failed-row cost and treats missing failure_type as unknown", () => {
    const summary = buildAiUsageAdminSummary([
      {
        operation: "activity-suggestions",
        success: false,
        estimated_cost: 9.99,
      },
    ]);

    expect(summary.estimatedCost).toBe(0);
    expect(summary.byFailureType).toEqual({ unknown: 1 });
    expect(summary.byOperation["quest-step-hint"]).toEqual({
      success: 0,
      failure: 0,
      estimatedCost: 0,
    });
  });

  it("returns zeros for an empty list", () => {
    expect(buildAiUsageAdminSummary([])).toEqual({
      estimatedCost: 0,
      successCount: 0,
      failureCount: 0,
      callCount: 0,
      byOperation: {
        "activity-suggestions": {
          success: 0,
          failure: 0,
          estimatedCost: 0,
        },
        "quest-step-hint": {
          success: 0,
          failure: 0,
          estimatedCost: 0,
        },
      },
      byFailureType: {},
    });
  });
});
