import { describe, expect, it } from "vitest";
import {
  buildMalformedJsonRetrySteer,
  buildMissingSlotRetrySteer,
  parseStructuredActivitiesResponse,
} from "./parseStructuredActivities.js";

describe("parseStructuredActivitiesResponse", () => {
  it("parses a complete activities payload", () => {
    const raw = JSON.stringify({
      activities: [
        { title: "A" },
        { title: "B" },
        { title: "C" },
      ],
    });
    const result = parseStructuredActivitiesResponse(raw, { expectedCount: 3 });
    expect(result.ok).toBe(true);
    expect(result.activities).toHaveLength(3);
  });

  it("detects truncated JSON", () => {
    const result = parseStructuredActivitiesResponse(
      '{"activities":[{"title":"A"',
      { expectedCount: 3 }
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("json-parse-failed");
    expect(result.activities).toEqual([]);
  });

  it("detects incomplete activity counts as partial", () => {
    const raw = JSON.stringify({
      activities: [{ title: "A" }, { title: "B" }],
    });
    const result = parseStructuredActivitiesResponse(raw, { expectedCount: 3 });
    expect(result.ok).toBe(false);
    expect(result.partial).toBe(true);
    expect(result.reason).toBe("incomplete-count");
    expect(result.activities).toHaveLength(2);
  });

  it("rejects missing activities array", () => {
    const result = parseStructuredActivitiesResponse("{}", {
      expectedCount: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing-activities");
  });
});

describe("retry steers", () => {
  it("builds malformed and missing-slot steers", () => {
    expect(buildMalformedJsonRetrySteer("json-parse-failed")).toContain(
      "FORMAT RETRY"
    );
    expect(
      buildMissingSlotRetrySteer({
        missingCount: 1,
        existingTitles: ["A"],
        activityStyle: "imaginative",
      })
    ).toContain('activityStyle must remain "imaginative"');
  });
});
