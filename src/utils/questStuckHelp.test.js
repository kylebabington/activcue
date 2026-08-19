import { describe, expect, it } from "vitest";
import { completeActivityV2Fixture } from "../fixtures/completeActivityV2Fixture";
import {
  MAX_AI_HINTS_PER_ACTIVITY,
  MAX_AI_HINTS_PER_STEP,
  canRequestAiHint,
  getLocalStuckSuggestions,
  isSynthesizedIfStuck,
  nextStuckSuggestion,
} from "./questStuckHelp";

describe("canRequestAiHint", () => {
  it("allows a couple of AI hints per scene and a small activity budget", () => {
    expect(MAX_AI_HINTS_PER_STEP).toBe(2);
    expect(MAX_AI_HINTS_PER_ACTIVITY).toBe(4);
    expect(canRequestAiHint({}, 0)).toBe(true);
    expect(canRequestAiHint({ 0: ["one"] }, 0)).toBe(true);
    expect(canRequestAiHint({ 0: ["one", "two"] }, 0)).toBe(false);
    expect(
      canRequestAiHint({ 0: ["a", "b"], 1: ["c"], 2: ["d"] }, 3)
    ).toBe(false);
  });
});

describe("getLocalStuckSuggestions", () => {
  it("uses this scene's starter ideas instead of generic try-easier copy", () => {
    const suggestions = getLocalStuckSuggestions(
      completeActivityV2Fixture.stepDetails[0]
    );
    expect(suggestions.some((item) => item.includes("Stack a radio"))).toBe(
      true
    );
    expect(
      suggestions.some((item) => /simpler version of this step/i.test(item))
    ).toBe(false);
  });

  it("skips generic ifStuck copy", () => {
    expect(
      getLocalStuckSuggestions({
        instruction: "Create your circus name and costume.",
        ifStuck: "Do a simpler version of this step and move on.",
        starterIdeas: [],
      })
    ).toEqual([]);
  });
});

describe("nextStuckSuggestion", () => {
  it("cycles through scene ideas", () => {
    expect(nextStuckSuggestion(["A", "B"], -1)).toEqual({
      suggestion: "A",
      cursor: 0,
    });
    expect(nextStuckSuggestion(["A", "B"], 0)).toEqual({
      suggestion: "B",
      cursor: 1,
    });
    expect(nextStuckSuggestion(["A", "B"], 1)).toEqual({
      suggestion: "A",
      cursor: 0,
    });
  });
});

describe("isSynthesizedIfStuck", () => {
  it("treats rewritten easiest-piece copy as generic", () => {
    expect(
      isSynthesizedIfStuck(
        "Try the easiest piece first: Create your circus name and costume."
      )
    ).toBe(true);
    expect(isSynthesizedIfStuck("Use a towel as a cape.")).toBe(false);
  });
});
