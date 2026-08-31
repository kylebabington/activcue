import { describe, expect, it } from "vitest";
import { activitySuggestionsSchemaV4 } from "./activitySuggestionsSchemaV4.js";
import { stormStrandedAnimalRescueV4Fixture } from "../../src/fixtures/stormStrandedAnimalRescueV4Fixture.js";
import { QUALITY_CONTRACT_VERSION } from "../utils/activityFormatConstants.js";

describe("activitySuggestionsSchemaV4", () => {
  const item = activitySuggestionsSchemaV4.properties.activities.items;

  it("requires activityFormatVersion 4 and qualityContractVersion", () => {
    expect(item.properties.activityFormatVersion.enum).toEqual([4]);
    expect(item.properties.qualityContractVersion.enum).toEqual([
      QUALITY_CONTRACT_VERSION,
    ]);
    expect(item.required).toEqual(
      expect.arrayContaining(["activityFormatVersion", "qualityContractVersion"])
    );
  });

  it("is imaginative-only", () => {
    expect(item.properties.activityStyle.enum).toEqual(["imaginative"]);
  });

  it("requires sceneSetup and sceneOutcome on stepDetails", () => {
    const step = item.properties.stepDetails.items;
    expect(step.required).toEqual(
      expect.arrayContaining(["sceneSetup", "sceneOutcome"])
    );
    expect(step.properties).not.toHaveProperty("storyBeat");
  });

  it("requires finishGuide.resolution", () => {
    const finish = item.properties.finishGuide;
    expect(finish.required).toEqual(
      expect.arrayContaining(["resolution", "action", "doneWhen"])
    );
  });

  it("golden fixture has all required V4 fields", () => {
    expect(stormStrandedAnimalRescueV4Fixture.activityFormatVersion).toBe(4);
    expect(stormStrandedAnimalRescueV4Fixture.qualityContractVersion).toBe(
      QUALITY_CONTRACT_VERSION
    );
    expect(stormStrandedAnimalRescueV4Fixture.activityStyle).toBe("imaginative");
    for (const step of stormStrandedAnimalRescueV4Fixture.stepDetails) {
      expect(step.sceneSetup?.length).toBeGreaterThan(20);
      expect(step.sceneOutcome?.length).toBeGreaterThan(20);
    }
    expect(stormStrandedAnimalRescueV4Fixture.finishGuide.resolution).toBeTruthy();
  });
});
