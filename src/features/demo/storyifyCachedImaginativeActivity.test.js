import { describe, expect, it } from "vitest";
import { storyifyCachedImaginativeActivity } from "./storyifyCachedImaginativeActivity";

describe("storyifyCachedImaginativeActivity", () => {
  it("turns dry imaginative steps into connected story scenes", () => {
    const result = storyifyCachedImaginativeActivity({
      slug: "silent-space-relay",
      title: "Silent Space Relay",
      activityStyle: "imaginative",
      visualTheme: "space",
      mission: "Build a station and deliver three notes.",
      kidRole: "Relay Captain",
      ageFit: { minAge: 7, maxAge: 10, maturityLevel: "child" },
      starterIdeas: [
        { title: "Lost rover", example: "A rover needs a beacon.", kind: "imagination" },
      ],
      stepDetails: [
        {
          title: "Build Mission Control",
          instruction: "Make a quiet message desk.",
          examples: ["Books as radio towers."],
          doneWhen: "You have a writing spot.",
          ifStuck: "Use a chair seat as the desk.",
          roleInstructions: [],
        },
      ],
    });

    expect(result.storyVoiceVersion).toBe(1);
    expect(result.stepDetails[0].title).toBe("Mission Control Wakes Up");
    expect(result.stepDetails[0].instruction).toMatch(/crackle runs through Mission Control/i);
    expect(result.stepDetails[0].instruction).toContain("Make a quiet message desk.");
    expect(result.stepDetails[0].doneWhen).toMatch(/writing spot|marker|ready/i);
    expect(result.stepDetails[0].starterIdeas.length).toBeGreaterThanOrEqual(2);
    expect(result.starterIdeas).toHaveLength(5);
  });

  it("uses a creative-coach voice for activities that reach older kids", () => {
    const result = storyifyCachedImaginativeActivity({
      slug: "teen-mystery-podcast-booth",
      title: "Teen Mystery Podcast Booth",
      activityStyle: "imaginative",
      visualTheme: "mystery",
      kidRole: "Podcast Producer",
      ageFit: { minAge: 11, maxAge: 16, maturityLevel: "tween" },
      steps: ["Make a recording corner."],
    });

    expect(result.stepDetails[0].instruction).toMatch(/cold open is yours to set/i);
    expect(result.stepDetails[0].ifStuck).toMatch(/^Quick reset:/);
    expect(result.roleGuide.description).toMatch(/control the choices/i);
    expect(result.stepDetails[0].instruction).not.toMatch(/Psst|Ooooh|nice timing/i);
  });

  it("leaves simple activities alone", () => {
    const simple = { title: "Draw a Picture", activityStyle: "simple" };
    expect(storyifyCachedImaginativeActivity(simple)).toBe(simple);
  });
});
