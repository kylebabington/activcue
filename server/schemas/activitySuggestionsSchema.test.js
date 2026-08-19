import { describe, expect, it } from "vitest";
import { activitySuggestionsSchemaV3 } from "./activitySuggestionsSchemaV3.js";

describe("activitySuggestionsSchemaV3", () => {
  it("requires setupGuide, finishGuide, and actions on steps", () => {
    const item =
      activitySuggestionsSchemaV3.properties.activities.items;
    expect(item.required).toContain("setupGuide");
    expect(item.required).toContain("finishGuide");
    expect(item.required).toContain("story");
    expect(item.properties.activityFormatVersion.enum).toEqual([3]);

    const step = item.properties.stepDetails.items;
    expect(step.required).toContain("actions");
    expect(step.properties.actions.minItems).toBe(1);
    expect(step.properties.instruction).toBeUndefined();
  });
});
