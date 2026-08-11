import { describe, expect, it } from "vitest";
import { buildActivitySuggestionsInstructions } from "./activitySuggestions.js";

describe("buildActivitySuggestionsInstructions", () => {
  it("gives imaginative activities a warm teacher voice for younger kids", () => {
    const instructions = buildActivitySuggestionsInstructions(
      "imaginative",
      "playroom"
    );

    expect(instructions).toContain(
      "Write like a warm teacher sitting beside the child and getting them started."
    );
    expect(instructions).toContain(
      "Every scene should feel like invitation → action → response"
    );
    expect(instructions).toContain(
      "doneWhen = a natural transition cue"
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
      'roleGuide is a specific activity title (e.g. "Room Redesign Lead")'
    );
    expect(instructions).toContain(
      "NEVER use a generic one-word role such as Explorer"
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
