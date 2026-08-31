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
});

describe("QUALITY_CONTRACT_VERSION", () => {
  it("matches golden fixture", () => {
    expect(stormStrandedAnimalRescueV4Fixture.qualityContractVersion).toBe(
      QUALITY_CONTRACT_VERSION
    );
  });
});
