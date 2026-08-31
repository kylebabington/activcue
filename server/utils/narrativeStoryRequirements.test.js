import { describe, expect, it } from "vitest";
import { UNDER10_OPENING_STORY } from "./narrativeStoryRequirements.js";
import { buildActivitySuggestionsInstructions } from "../prompts/activitySuggestions.js";

describe("UNDER10_OPENING_STORY constants", () => {
  it("defines aligned prompt and validator floors", () => {
    expect(UNDER10_OPENING_STORY.minSentences).toBe(3);
    expect(UNDER10_OPENING_STORY.minWords).toBe(50);
    expect(UNDER10_OPENING_STORY.targetSentences).toBe("3–5");
    expect(UNDER10_OPENING_STORY.targetWords).toBe("55–90");
  });

  it("matches imaginative under-10 prompt text", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom",
      { groupAgeContext: { oldestAge: 7 } }
    );
    expect(instructions).toContain(UNDER10_OPENING_STORY.targetSentences);
    expect(instructions).toContain(UNDER10_OPENING_STORY.targetWords);
    expect(instructions).toContain("WHAT happened before play began");
    expect(instructions).toContain("WHY the child/children are needed");
  });
});
