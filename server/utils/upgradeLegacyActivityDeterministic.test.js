import { describe, expect, it } from "vitest";
import { upgradeLegacyActivityDeterministic } from "./upgradeLegacyActivityDeterministic.js";

describe("upgradeLegacyActivityDeterministic", () => {
  it("maps mission → story and uses → setupGuide.needed without inventing finish copy", () => {
    const { activity, upgraded } = upgradeLegacyActivityDeterministic({
      title: "Cardboard Zoo",
      style: "imaginative",
      mission: "Build habitats for toy animals from cardboard boxes.",
      uses: ["cardboard", "markers"],
      steps: [
        {
          title: "Make dens",
          instruction: "Fold a box into a den. Draw a door. Put one animal inside.",
          doneWhen: "Each animal has a den.",
          ifStuck: "Start with the smallest box.",
          starterIdeas: ["Lion den with paper grass."],
        },
      ],
      extensionIdeas: ["Add a zoo map."],
    });

    expect(upgraded).toBe(true);
    expect(activity.story).toContain("cardboard");
    expect(activity.activityStyle).toBe("imaginative");
    expect(activity.setupGuide.needed).toEqual(["cardboard", "markers"]);
    expect(activity.stepDetails[0].actions.length).toBeGreaterThan(0);
    expect(activity.finishGuide.extensions).toContain("Add a zoo map.");
    // Must not invent wrap-up filler
    expect(activity.finishGuide.action).toBe("");
  });
});
