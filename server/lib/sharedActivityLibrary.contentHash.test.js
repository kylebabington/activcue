import { describe, expect, it } from "vitest";
import { computeActivityContentHash } from "./sharedActivityLibrary.js";
import { stormStrandedAnimalRescueV4Fixture } from "../../src/fixtures/stormStrandedAnimalRescueV4Fixture.js";

describe("computeActivityContentHash", () => {
  it("changes when V4 scene narrative fields change", () => {
    const base = computeActivityContentHash(stormStrandedAnimalRescueV4Fixture);
    const modified = {
      ...stormStrandedAnimalRescueV4Fixture,
      stepDetails: stormStrandedAnimalRescueV4Fixture.stepDetails.map((step, index) =>
        index === 0
          ? { ...step, sceneOutcome: "A different story consequence entirely." }
          : step
      ),
    };
    expect(computeActivityContentHash(modified)).not.toBe(base);
  });

  it("includes activityFormatVersion and qualityContractVersion for V4", () => {
    const hashA = computeActivityContentHash(stormStrandedAnimalRescueV4Fixture);
    const hashB = computeActivityContentHash({
      ...stormStrandedAnimalRescueV4Fixture,
      qualityContractVersion: 99,
    });
    expect(hashA).not.toBe(hashB);
  });
});
