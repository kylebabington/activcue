import { describe, expect, it } from "vitest";
import { lostShellSignalV3Fixture } from "../../src/fixtures/lostShellSignalV3Fixture.js";
import { normalizeActivityV3 } from "./normalizeActivityV3.js";
import {
  isCachedActivityPayloadClean,
  validateActivityForDisplay,
} from "./activityDisplayValidation.js";

describe("validateActivityForDisplay", () => {
  it("accepts the complete V3 golden fixture as cached", () => {
    const result = validateActivityForDisplay(lostShellSignalV3Fixture, {
      mode: "cached",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("requires whyItFits only for generation mode", () => {
    const withoutWhy = { ...lostShellSignalV3Fixture };
    delete withoutWhy.whyItFits;
    expect(
      validateActivityForDisplay(withoutWhy, { mode: "cached" }).valid
    ).toBe(true);
    expect(
      validateActivityForDisplay(withoutWhy, { mode: "generation" }).errors
    ).toContain("missing-why-it-fits");
  });

  it("rejects missing setupGuide", () => {
    const activity = {
      ...lostShellSignalV3Fixture,
      setupGuide: { needed: [], steps: [], readyWhen: "" },
      uses: [],
    };
    const result = validateActivityForDisplay(activity);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining(["missing-setup-steps", "missing-supplies"])
    );
  });

  it("rejects step missing starter ideas", () => {
    const activity = structuredClone(lostShellSignalV3Fixture);
    activity.stepDetails[0].starterIdeas = [];
    activity.starterIdeas = [];
    const result = validateActivityForDisplay(activity);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("step-1-missing-starter-ideas");
  });

  it("rejects normalizer filler roles and finish copy", () => {
    const thin = {
      title: "Thin Quest",
      activityStyle: "imaginative",
      visualTheme: "adventure",
      summary: "A short summary that is just long enough.",
      estimatedMinutes: 20,
      energy: "medium",
      mess: "low",
      adultHelp: "none",
      categories: ["pretend"],
      traits: { setupEffort: "low" },
      story: "Once upon a time there was a vague mission with no concrete play.",
      roleGuide: {
        name: "Player",
        description: "You play the activity somehow.",
      },
      ageFit: {
        minAge: 5,
        maxAge: 8,
        targetAges: [6],
        maturityLevel: "child",
        independenceLevel: "guided",
        ageFitReason: "Age band matches early elementary pretend play.",
      },
      uses: ["paper"],
      setupGuide: {
        needed: ["paper"],
        steps: ["Get paper."],
        readyWhen: "Paper is ready.",
      },
      starterIdeas: [{ title: "Idea", example: "Do something fun with paper." }],
      stepDetails: [
        {
          title: "Scene",
          actions: ["Do the thing."],
          starterIdeas: [{ title: "Go", example: "Start drawing a map." }],
          doneWhen: "You finished this step.",
          ifStuck: "Try again.",
        },
      ],
      finishGuide: {
        action: "Wrap up the activity.",
        doneWhen: "You have finished the ending.",
      },
    };

    // Even after normalize, filler must not validate as display-ready.
    const normalized = normalizeActivityV3(thin, "imaginative", [6]);
    const result = validateActivityForDisplay(normalized);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "generic-role-filler",
        "generic-finish-filler",
      ])
    );
  });

  it("treats generation-only personal fields as optional for cached cleanliness", () => {
    expect(
      isCachedActivityPayloadClean({
        ...lostShellSignalV3Fixture,
        whyItFits: undefined,
      })
    ).toBe(true);
    expect(
      isCachedActivityPayloadClean({
        ...lostShellSignalV3Fixture,
        whyItFits: "Because Sam loves shells.",
      })
    ).toBe(false);
  });
});
