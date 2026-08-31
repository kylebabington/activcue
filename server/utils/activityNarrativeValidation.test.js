import { describe, expect, it } from "vitest";
import { stormStrandedAnimalRescueV4Fixture } from "../../src/fixtures/stormStrandedAnimalRescueV4Fixture.js";
import {
  decorativeStoryWrapperFixture,
  genericThemedTaskListFixture,
  genericTransitionFillerFixture,
} from "../../src/fixtures/narrativeValidationFixtures.js";
import { lostShellSignalV3Fixture } from "../../src/fixtures/lostShellSignalV3Fixture.js";
import {
  validateActivityNarrative,
  formatNarrativeSteerHints,
} from "./activityNarrativeValidation.js";
import { QUALITY_CONTRACT_VERSION } from "./activityFormatConstants.js";

function buildMinimalV4Activity(storyOverrides = {}) {
  return {
    ...stormStrandedAnimalRescueV4Fixture,
    story:
      "Overnight, a thunderstorm tore through Pinecone Wildlife Sanctuary and flooded the creek beside the animal shelter. " +
      "Three young stuffed animals are still inside the shelter, but the water is rising and another storm is forecast before sunset. " +
      "The wooden bridge washed away, so nobody can reach the shelter from the main trail until a safe crossing is built. " +
      "You are the rescue ranger who must reach them and get everyone inside before the weather worsens again tonight.",
    roleGuide: {
      name: "Rescue Ranger",
      description: "Reach the stranded animals and get everyone to safety.",
      childRoles: [],
    },
    ...storyOverrides,
  };
}

describe("validateActivityNarrative", () => {
  it("passes the golden causal V4 fixture", () => {
    const result = validateActivityNarrative(stormStrandedAnimalRescueV4Fixture, {
      oldestAge: 7,
      participantCount: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("skips V3 activities (not narrative-valid for V4 contract)", () => {
    const result = validateActivityNarrative(lostShellSignalV3Fixture, {
      oldestAge: 8,
    });
    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("requires qualityContractVersion on V4", () => {
    const activity = {
      ...stormStrandedAnimalRescueV4Fixture,
      qualityContractVersion: undefined,
    };
    const result = validateActivityNarrative(activity, { oldestAge: 7 });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("quality-contract-missing");
  });

  it("rejects generic themed task list fixture", () => {
    const result = validateActivityNarrative(genericThemedTaskListFixture, {
      oldestAge: 7,
    });
    expect(result.valid).toBe(false);
    expect(
      result.reasons.some((reason) =>
        [
          "story-missing-problem",
          "story-too-thin",
          "scene-setup-command-only",
          "scene-setup-missing",
        ].includes(reason)
      )
    ).toBe(true);
  });

  it("rejects decorative story wrapper fixture", () => {
    const result = validateActivityNarrative(decorativeStoryWrapperFixture, {
      oldestAge: 7,
    });
    expect(result.valid).toBe(false);
    expect(
      result.reasons.some((reason) =>
        ["story-missing-problem", "story-too-thin", "scene-setup-missing"].includes(reason)
      )
    ).toBe(true);
  });

  it("rejects generic transition filler in scene outcomes", () => {
    const result = validateActivityNarrative(genericTransitionFillerFixture, {
      oldestAge: 7,
    });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("scene-outcome-generic");
    expect(
      result.reasons.some((reason) =>
        ["scene-setup-generic", "scene-outcome-missing", "story-too-thin"].includes(reason)
      )
    ).toBe(true);
  });

  it("requires sceneSetup on each V4 step", () => {
    const activity = {
      ...stormStrandedAnimalRescueV4Fixture,
      stepDetails: stormStrandedAnimalRescueV4Fixture.stepDetails.map((step, index) =>
        index === 0 ? { ...step, sceneSetup: "" } : step
      ),
    };
    const result = validateActivityNarrative(activity, { oldestAge: 7 });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("scene-setup-missing");
  });

  it("requires sceneOutcome on each V4 step", () => {
    const activity = {
      ...stormStrandedAnimalRescueV4Fixture,
      stepDetails: stormStrandedAnimalRescueV4Fixture.stepDetails.map((step, index) =>
        index === 1 ? { ...step, sceneOutcome: "" } : step
      ),
    };
    const result = validateActivityNarrative(activity, { oldestAge: 7 });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("scene-outcome-missing");
  });

  it("rejects duplicated finishGuide fields", () => {
    const duplicate = "All three animals are safe inside the ranger station.";
    const activity = {
      ...stormStrandedAnimalRescueV4Fixture,
      finishGuide: {
        ...stormStrandedAnimalRescueV4Fixture.finishGuide,
        resolution: duplicate,
        action: duplicate,
      },
    };
    const result = validateActivityNarrative(activity, { oldestAge: 7 });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("finish-fields-duplicated");
  });

  it("rejects V4 with simple activityStyle", () => {
    const activity = {
      ...stormStrandedAnimalRescueV4Fixture,
      activityStyle: "simple",
    };
    const result = validateActivityNarrative(activity, { oldestAge: 7 });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("v4-style-mismatch");
  });

  it("passes under-10 story with 55+ words and 3+ causal sentences", () => {
    const result = validateActivityNarrative(buildMinimalV4Activity(), {
      oldestAge: 7,
      participantCount: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.reasons).not.toContain("story-too-thin");
  });

  it("rejects under-10 story with 3 sentences but under 50 words", () => {
    const result = validateActivityNarrative(
      buildMinimalV4Activity({
        story:
          "A storm flooded the creek by the shelter. " +
          "Three animals are trapped inside alone. " +
          "You must reach them fast.",
      }),
      { oldestAge: 7 }
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("story-too-thin");
  });

  it("rejects production-like thin stories (~40–46 words, 2 sentences)", () => {
    const result = validateActivityNarrative(
      buildMinimalV4Activity({
        story:
          "A thunderstorm flooded the creek beside the Pinecone Wildlife Sanctuary animal shelter and three young stuffed animals are still trapped inside alone. " +
          "The water is rising fast toward the shelter door and you must reach them before the next storm arrives tonight.",
      }),
      { oldestAge: 7 }
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("story-too-thin");
  });

  it("allows contribution-based multi-child story without exact roleTitle strings", () => {
    const result = validateActivityNarrative(
      buildMinimalV4Activity({
        story:
          "Overnight, wind tore through the backyard bird sanctuary and scattered nesting supplies across the patio. " +
          "Several small birds are calling from different corners, but none can find safe nests before nightfall. " +
          "One of you prepares safe nests while the other decodes the animal signals so every bird reaches the right shelter. " +
          "If the nests are not ready before dusk, the youngest birds may stay exposed in the cold.",
        roleGuide: {
          name: "Nest Rescue Team",
          description: "Prepare nests and guide birds to safety.",
          childRoles: [
            {
              childName: "Sam",
              age: 6,
              roleTitle: "Animal Nest Builder",
              responsibility: "Prepare safe nests.",
              firstAction: "Gather soft materials.",
            },
            {
              childName: "Riley",
              age: 8,
              roleTitle: "Clue Match Captain",
              responsibility: "Decode bird signals.",
              firstAction: "Listen for calls.",
            },
          ],
        },
      }),
      { oldestAge: 7, participantCount: 2 }
    );
    expect(result.valid).toBe(true);
    expect(result.reasons).not.toContain("story-roles-missing");
    expect(result.warnings?.some((w) => w.code === "story-roles-missing")).toBe(
      true
    );
  });
});

describe("formatNarrativeSteerHints", () => {
  it("returns causality retry guidance for narrative failures", () => {
    const hints = formatNarrativeSteerHints([
      "scene-setup-command-only",
      "scene-outcome-generic",
    ]);
    expect(hints.join(" ")).toMatch(/CAUSALITY RETRY/i);
    expect(hints.join(" ")).toMatch(/sceneSetup/i);
  });

  it("uses aligned under-10 story targets for story-too-thin", () => {
    const hints = formatNarrativeSteerHints(["story-too-thin"]);
    expect(hints.join(" ")).toMatch(/3–5 sentence/i);
    expect(hints.join(" ")).toMatch(/55–90 words/i);
  });
});

describe("QUALITY_CONTRACT_VERSION", () => {
  it("matches golden fixture", () => {
    expect(stormStrandedAnimalRescueV4Fixture.qualityContractVersion).toBe(
      QUALITY_CONTRACT_VERSION
    );
  });
});
