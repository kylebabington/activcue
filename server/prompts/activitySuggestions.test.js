import { describe, expect, it } from "vitest";
import { buildActivitySuggestionsInstructions } from "./activitySuggestions.js";

describe("buildActivitySuggestionsInstructions", () => {
  it("gives imaginative activities a lively story-first voice", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom"
    );

    expect(instructions).toContain(
      "Sound like a bubbly, creative teacher who has a gift for making ordinary things feel exciting."
    );
    expect(instructions).toContain(
      "Every step should advance the story"
    );
    expect(instructions).toContain(
      "instruction = 1 to 3 lively sentences"
    );
    expect(instructions).toContain(
      "The child should feel spoken to, not instructed at."
    );
  });

  it("keeps simple activities practical instead of forcing story framing", () => {
    const instructions = buildActivitySuggestionsInstructions("simple", "playroom");

    expect(instructions).toContain(
      'If safeActivityStyle is "simple":'
    );
    expect(instructions).toContain(
      "Do NOT create an elaborate pretend story."
    );
  });
});
