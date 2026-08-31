import { describe, expect, it } from "vitest";
import { validateActivityClarity, textSimilarity } from "./activityClarityValidation.js";
import { lostShellSignalV3Fixture } from "../../src/fixtures/lostShellSignalV3Fixture.js";

describe("validateActivityClarity", () => {
  it("accepts the Lost Shell Signal golden fixture", () => {
    const result = validateActivityClarity(lostShellSignalV3Fixture, {
      youngestAge: 9,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects duplicate starter title and example", () => {
    const result = validateActivityClarity({
      ...lostShellSignalV3Fixture,
      starterIdeas: [
        {
          title: "Storm warning",
          example: "Storm warning",
          kind: "imagination",
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("identical"))).toBe(true);
  });

  it("rejects generic doneWhen", () => {
    const result = validateActivityClarity({
      ...lostShellSignalV3Fixture,
      stepDetails: [
        {
          ...lostShellSignalV3Fixture.stepDetails[0],
          doneWhen: "You finished this step.",
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects independent activities that require a parent", () => {
    const result = validateActivityClarity({
      ...lostShellSignalV3Fixture,
      adultHelp: "none",
      setupGuide: {
        ...lostShellSignalV3Fixture.setupGuide,
        steps: ["Ask a grown-up to hide the clues."],
      },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects scenes with no actions", () => {
    const result = validateActivityClarity({
      ...lostShellSignalV3Fixture,
      stepDetails: [
        {
          ...lostShellSignalV3Fixture.stepDetails[0],
          actions: [],
        },
      ],
    });
    expect(result.valid).toBe(false);
  });
});

describe("textSimilarity", () => {
  it("flags highly overlapping copy", () => {
    expect(
      textSimilarity(
        "Visit each station and decode the clue",
        "Visit each station and decode every clue"
      )
    ).toBeGreaterThan(0.5);
  });
});
