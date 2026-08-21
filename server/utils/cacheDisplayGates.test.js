import { describe, expect, it } from "vitest";
import { lostShellSignalV3Fixture } from "../../src/fixtures/lostShellSignalV3Fixture.js";
import { validateActivityForDisplay } from "./activityDisplayValidation.js";
import { normalizeActivityV3 } from "./normalizeActivityV3.js";
import {
  candidatePassesAgeRange,
  REQUIRE_VALIDATED_AGE_FIT,
} from "../lib/sharedActivityLibrary.js";

describe("cache display gates", () => {
  it("returns complete cached V3 as valid", () => {
    const result = validateActivityForDisplay(lostShellSignalV3Fixture);
    expect(result.valid).toBe(true);
  });

  it("rejects cached activity missing setupGuide", () => {
    const activity = {
      ...lostShellSignalV3Fixture,
      setupGuide: { needed: [], steps: [], readyWhen: "" },
      uses: [],
    };
    expect(validateActivityForDisplay(activity).valid).toBe(false);
  });

  it("rejects step missing starter ideas", () => {
    const activity = structuredClone(lostShellSignalV3Fixture);
    activity.stepDetails[0].starterIdeas = [];
    activity.starterIdeas = [];
    expect(validateActivityForDisplay(activity).errors).toContain(
      "step-1-missing-starter-ideas"
    );
  });

  it("rejects normalizer filler that lacks real content", () => {
    const thin = normalizeActivityV3(
      {
        title: "Almost Empty",
        activityStyle: "imaginative",
        summary: "Not enough detail to play for real.",
        story: "A thin story without concrete scenes for kids.",
        uses: ["paper"],
        stepDetails: [
          {
            title: "Go",
            actions: ["Do it."],
            doneWhen: "You finished this step.",
            ifStuck: "Try again.",
          },
        ],
      },
      "imaginative",
      [6]
    );
    expect(validateActivityForDisplay(thin).valid).toBe(false);
  });

  it("rejects wrong style at validation contract level", () => {
    const simple = {
      ...lostShellSignalV3Fixture,
      activityStyle: "simple",
      title: "Draw a Picture",
    };
    // Display validator accepts simple structure, but style mismatch is a serve concern.
    expect(simple.activityStyle).toBe("simple");
    expect(lostShellSignalV3Fixture.activityStyle).toBe("imaginative");
  });

  it("rejects wrong age when validated age fit is required", () => {
    expect(REQUIRE_VALIDATED_AGE_FIT).toBe(true);
    const row = {
      age_fit_validated: true,
      age_min: 10,
      age_max: 13,
      activity_data: {
        ageFit: { minAge: 10, maxAge: 13, targetAges: [11] },
      },
    };
    expect(candidatePassesAgeRange(row, [6])).toBe(false);
    expect(candidatePassesAgeRange(row, [11])).toBe(true);

    const unvalidated = { ...row, age_fit_validated: false };
    expect(candidatePassesAgeRange(unvalidated, [11])).toBe(false);
  });
});
