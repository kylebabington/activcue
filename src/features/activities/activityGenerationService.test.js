import { describe, expect, it } from "vitest";
import {
  assertActivitiesMatchRequestedStyle,
  isImaginativeGenerationStyle,
  resolveGenerationFailureAction,
} from "./activityGenerationService";

describe("resolveGenerationFailureAction", () => {
  it("allows simple templates for simple style on generic errors", () => {
    expect(
      resolveGenerationFailureAction({
        activityStyle: "simple",
        errorStatus: 500,
      })
    ).toEqual({
      action: "simple_templates",
      reason: "simple-offline-fallback",
    });
  });

  it("never allows simple templates for imaginative style", () => {
    expect(
      resolveGenerationFailureAction({
        activityStyle: "imaginative",
        errorStatus: 500,
      }).action
    ).toBe("imaginative_cache_then_retry");

    expect(
      resolveGenerationFailureAction({
        activityStyle: "imaginative",
        errorStatus: 500,
        alreadyRetriedAi: true,
      }).action
    ).toBe("fail");
  });

  it("hard-fails on AI_RESPONSE_INVALID for both styles", () => {
    expect(
      resolveGenerationFailureAction({
        activityStyle: "simple",
        errorCode: "AI_RESPONSE_INVALID",
        errorStatus: 422,
      }).action
    ).toBe("fail");

    expect(
      resolveGenerationFailureAction({
        activityStyle: "imaginative",
        errorCode: "AI_RESPONSE_INVALID",
        errorStatus: 422,
      }).action
    ).toBe("fail");
  });

  it("hard-fails on 422 / AGE_FIT_FAILED", () => {
    expect(
      resolveGenerationFailureAction({
        activityStyle: "imaginative",
        errorCode: "AGE_FIT_FAILED",
        errorStatus: 422,
      }).action
    ).toBe("fail");
  });
});

describe("assertActivitiesMatchRequestedStyle", () => {
  it("rejects simple activities when imaginative was requested", () => {
    const result = assertActivitiesMatchRequestedStyle(
      [
        { title: "Secret Base", activityStyle: "imaginative" },
        { title: "Draw a Picture", activityStyle: "simple" },
      ],
      "imaginative"
    );
    expect(result.ok).toBe(false);
    expect(result.mismatchedTitles).toContain("Draw a Picture");
  });

  it("accepts imaginative activities for imaginative request", () => {
    const result = assertActivitiesMatchRequestedStyle(
      [{ title: "Secret Base", activityStyle: "imaginative" }],
      "imaginative"
    );
    expect(result.ok).toBe(true);
  });
});

describe("isImaginativeGenerationStyle", () => {
  it("detects imaginative style", () => {
    expect(isImaginativeGenerationStyle("imaginative")).toBe(true);
    expect(isImaginativeGenerationStyle("simple")).toBe(false);
  });
});
