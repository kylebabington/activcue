import { describe, expect, it } from "vitest";
import {
  getActivityCopyAgeBand,
  getActivityStarterSectionLabel,
  getStepStarterIdeas,
  getStepStarterSectionLabel,
  getStepStuckPrompts,
} from "./activityVisualTheme.js";

describe("getStepStuckPrompts", () => {
  it("returns stuckPrompts and ifStuck only (not examples)", () => {
    const prompts = getStepStuckPrompts({
      stuckPrompts: ["Start with the smallest piece."],
      ifStuck: "Copy the example once, then change one thing.",
      examples: ["Build a two-block tower.", "Make a bridge."],
    });

    expect(prompts).toEqual([
      "Start with the smallest piece.",
      "Copy the example once, then change one thing.",
    ]);
  });

  it("uses ifStuck when no explicit stuckPrompts exist", () => {
    expect(
      getStepStuckPrompts({
        ifStuck: "Make the simplest version first.",
        examples: ["Draw one shape.", "Add one detail."],
      })
    ).toEqual(["Make the simplest version first."]);
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

describe("getStepStarterIdeas", () => {
  it("prefers structured starterIdeas", () => {
    expect(
      getStepStarterIdeas({
        starterIdeas: [
          {
            title: "Claim a chair",
            example: "Use the nearest chair as Station One.",
            kind: "choice",
          },
        ],
        examples: ["Ignore me"],
      })
    ).toEqual([
      {
        title: "Claim a chair",
        example: "Use the nearest chair as Station One.",
        kind: "choice",
      },
    ]);
  });

  it("maps legacy examples into temporary starters", () => {
    expect(
      getStepStarterIdeas({
        examples: ["Use the chair.", "Draw a symbol."],
      })
    ).toEqual([
      {
        title: "Use the chair.",
        example: "Use the chair.",
        kind: "imagination",
      },
      {
        title: "Draw a symbol.",
        example: "Draw a symbol.",
        kind: "imagination",
      },
    ]);
  });

  it("caps at three starters", () => {
    expect(
      getStepStarterIdeas({
        examples: ["a", "b", "c", "d"],
      })
    ).toHaveLength(3);
  });
});

describe("age-aware starter labels", () => {
  it("resolves copy age band from maturity or maxAge", () => {
    expect(getActivityCopyAgeBand({ ageFit: { maturityLevel: "teen" } })).toBe(
      "teen"
    );
    expect(getActivityCopyAgeBand({ ageFit: { maxAge: 11 } })).toBe("tween");
    expect(getActivityCopyAgeBand({ ageFit: { maxAge: 8 } })).toBe("younger");
  });

  it("labels activity and step starter sections by age", () => {
    const younger = { activityStyle: "imaginative", ageFit: { maxAge: 7 } };
    const tween = { activityStyle: "imaginative", ageFit: { maxAge: 11 } };
    const teen = { activityStyle: "imaginative", ageFit: { maxAge: 14 } };

    expect(getActivityStarterSectionLabel(younger)).toBe(
      "Pick how your story begins"
    );
    expect(getActivityStarterSectionLabel(tween)).toBe(
      "Pick a starting direction"
    );
    expect(getStepStarterSectionLabel(younger)).toBe(
      "Need an idea? Try one of these"
    );
    expect(getStepStarterSectionLabel(tween)).toBe("A few ways in");
    expect(getStepStarterSectionLabel(teen)).toBe("Try this");
  });
});
