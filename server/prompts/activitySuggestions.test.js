import { describe, expect, it } from "vitest";
import { buildActivitySuggestionsInstructions } from "./activitySuggestions.js";

describe("buildActivitySuggestionsInstructions", () => {
  it("gives imaginative activities a lively story-first voice for younger kids", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom"
    );

    expect(instructions).toContain(
      "Sound like a bubbly, creative teacher who has a gift for making ordinary things feel exciting."
    );
    expect(instructions).toContain("Every step should advance the story");
    expect(instructions).toContain(
      "instruction = lively setup + clear action"
    );
    expect(instructions).toContain(
      "The child should feel spoken to, not instructed at."
    );
  });

  it("steers teens toward creative thinking instead of pretend stories", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom"
    );

    expect(instructions).toContain("Ages 13+ (teen): imaginative = thinking skills");
    expect(instructions).toContain(
      "do not invent an imaginary story world unless the child's listed interests explicitly ask for roleplay/fiction"
    );
    expect(instructions).toContain(
      "roleGuide is a job/brief title (Designer, Strategist, Inventor, Director)"
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
