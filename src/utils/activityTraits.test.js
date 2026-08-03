import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CATEGORIES,
  activityTraitsMatch,
  inferActivityTraits,
  traitsSimilarityScore,
} from "./activityTraits";

describe("inferActivityTraits", () => {
  it("prefers AI-provided categories and traits", () => {
    const traits = inferActivityTraits({
      title: "Cardboard Castle",
      categories: ["building", "creative"],
      traits: {
        setupEffort: "low",
        structure: "open-ended",
        socialMode: "cooperative",
        creativity: "high",
        movement: "medium",
      },
      energy: "medium",
      mess: "medium",
    });

    expect(traits.category).toBe("building");
    expect(traits.categories).toEqual(["building", "creative"]);
    expect(traits.setupEffort).toBe("low");
    expect(traits.structure).toBe("open-ended");
    expect(traits.socialMode).toBe("cooperative");
    expect(traits.creativity).toBe("high");
    expect(traits.movement).toBe("medium");
  });

  it("infers building traits from LEGO free build", () => {
    const traits = inferActivityTraits({
      title: "LEGO Free Build",
      summary: "Open-ended tower time",
      uses: ["LEGO"],
      energy: "medium",
      mess: "low",
    });

    expect(traits.category).toBe("building");
    expect(traits.structure).toBe("open-ended");
    expect(traits.movement).toBe("medium");
    expect(traits.setupEffort).toBe("medium");
    expect(ACTIVITY_CATEGORIES).toContain(traits.category);
  });

  it("infers creative vs reading vs nature categories", () => {
    expect(
      inferActivityTraits({
        title: "Quiet Drawing",
        uses: ["crayons"],
        energy: "low",
        mess: "low",
      }).category
    ).toBe("creative");

    expect(
      inferActivityTraits({
        title: "Picture Book Time",
        summary: "Read together on the couch",
        energy: "low",
        mess: "low",
      }).category
    ).toBe("reading");

    expect(
      inferActivityTraits({
        title: "Backyard Nature Walk",
        summary: "Outdoor scavenger hunt",
        energy: "high",
        mess: "low",
      }).category
    ).toBe("nature");
  });

  it("raises cleanup effort for sensory/high mess", () => {
    const traits = inferActivityTraits({
      title: "Sensory Bin Dig",
      uses: ["kinetic sand", "cups"],
      energy: "medium",
      mess: "high",
    });

    expect(traits.category).toBe("sensory");
    expect(traits.cleanupEffort).toBe("high");
    expect(traits.setupEffort).toBe("high");
  });

  it("matches different titles when traits align", () => {
    const lego = {
      title: "LEGO City Build",
      uses: ["LEGO"],
      energy: "medium",
      mess: "low",
    };
    const blocks = {
      title: "Block Tower Challenge",
      uses: ["blocks"],
      energy: "medium",
      mess: "low",
    };

    expect(activityTraitsMatch(lego, blocks)).toBe(true);
    expect(
      traitsSimilarityScore(
        inferActivityTraits(lego),
        inferActivityTraits(blocks)
      )
    ).toBeGreaterThanOrEqual(4);
  });
});
