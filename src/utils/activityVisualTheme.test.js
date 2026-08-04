import { describe, expect, it } from "vitest";
import { getStepStuckPrompts } from "./activityVisualTheme.js";

describe("getStepStuckPrompts", () => {
  it("returns at most three step-local prompts in priority order", () => {
    const prompts = getStepStuckPrompts({
      stuckPrompts: ["Start with the smallest piece."],
      ifStuck: "Copy the example once, then change one thing.",
      examples: ["Build a two-block tower.", "Make a bridge."],
    });

    expect(prompts).toEqual([
      "Start with the smallest piece.",
      "Copy the example once, then change one thing.",
      "Try this: Build a two-block tower.",
    ]);
  });

  it("uses existing Activity V2 ifStuck and examples when no explicit prompts exist", () => {
    expect(
      getStepStuckPrompts({
        ifStuck: "Make the simplest version first.",
        examples: ["Draw one shape.", "Add one detail."],
      })
    ).toEqual([
      "Make the simplest version first.",
      "Try this: Draw one shape.",
      "Try this: Add one detail.",
    ]);
  });

  it("deduplicates prompts and handles invalid input", () => {
    expect(
      getStepStuckPrompts({
        stuckPrompts: ["Try one block.", "try one block."],
        ifStuck: "Try one block.",
        examples: [],
      })
    ).toEqual(["Try one block."]);

    expect(getStepStuckPrompts(null)).toEqual([]);
  });
});
