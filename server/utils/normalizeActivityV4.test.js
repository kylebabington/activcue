import { describe, expect, it } from "vitest";
import { normalizeActivityV4 } from "./normalizeActivityV4.js";
import { stormStrandedAnimalRescueV4Fixture } from "../../src/fixtures/stormStrandedAnimalRescueV4Fixture.js";
import { lostShellSignalV3Fixture } from "../../src/fixtures/lostShellSignalV3Fixture.js";

describe("normalizeActivityV4", () => {
  it("stamps format and quality contract versions", () => {
    const normalized = normalizeActivityV4(
      stormStrandedAnimalRescueV4Fixture,
      "imaginative",
      [7]
    );
    expect(normalized.activityFormatVersion).toBe(4);
    expect(normalized.qualityContractVersion).toBe(1);
    expect(normalized.activityStyle).toBe("imaginative");
  });

  it("preserves sceneSetup and sceneOutcome without inventing them", () => {
    const normalized = normalizeActivityV4(
      stormStrandedAnimalRescueV4Fixture,
      "imaginative",
      [7]
    );
    expect(normalized.stepDetails[0].sceneSetup).toBe(
      stormStrandedAnimalRescueV4Fixture.stepDetails[0].sceneSetup
    );
    expect(normalized.stepDetails[0].sceneOutcome).toBe(
      stormStrandedAnimalRescueV4Fixture.stepDetails[0].sceneOutcome
    );
    expect(normalized.finishGuide.resolution).toBe(
      stormStrandedAnimalRescueV4Fixture.finishGuide.resolution
    );
  });

  it("does not invent sceneSetup from legacy storyBeat", () => {
    const v3WithBeats = {
      ...lostShellSignalV3Fixture,
      activityFormatVersion: 4,
      qualityContractVersion: 1,
      stepDetails: lostShellSignalV3Fixture.stepDetails.map((step) => ({
        ...step,
        sceneSetup: undefined,
        sceneOutcome: undefined,
      })),
    };
    const normalized = normalizeActivityV4(v3WithBeats, "imaginative", [8]);
    expect(normalized.stepDetails[0].sceneSetup).toBeUndefined();
    expect(normalized.stepDetails[0].sceneOutcome).toBeUndefined();
    expect(normalized.stepDetails[0].storyBeat).toBeUndefined();
  });

  it("does not invent finishGuide.resolution from generic fallbacks", () => {
    const activity = {
      ...stormStrandedAnimalRescueV4Fixture,
      finishGuide: {
        action: "Do the ending step.",
        example: "",
        doneWhen: "You are done.",
        extensions: [],
      },
    };
    const normalized = normalizeActivityV4(activity, "imaginative", [7]);
    expect(normalized.finishGuide.resolution).toBeUndefined();
    expect(normalized.finishGuide.action).toBe("Do the ending step.");
  });
});
