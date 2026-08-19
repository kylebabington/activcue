import { describe, expect, it } from "vitest";
import { completeActivityV2Fixture } from "../fixtures/completeActivityV2Fixture";
import { buildNarrationText } from "./buildNarrationText";

describe("buildNarrationText", () => {
  it("builds an overview script from the mission/story text", () => {
    const text = buildNarrationText(completeActivityV2Fixture, "mission");
    expect(text).toContain("moon base radios have gone almost silent");
    expect(text).not.toContain("Choose a desk spot");
  });

  it("builds a role script from roleGuide fields", () => {
    const text = buildNarrationText(completeActivityV2Fixture, "role");
    expect(text).toContain("Communications Officer");
    expect(text).toContain("Send three messages");
    expect(text).toContain("Choose a desk spot");
    expect(text).toContain("Sam is the Signal Runner");
  });

  it("builds supplies and finish narration for the play board", () => {
    expect(buildNarrationText(completeActivityV2Fixture, "materials")).toContain(
      "paper"
    );
    expect(buildNarrationText(completeActivityV2Fixture, "finish")).toContain(
      "night-crew briefing card"
    );
  });

  it("builds a single scene script with the full instruction and a move-on cue", () => {
    const text = buildNarrationText(completeActivityV2Fixture, "step", {
      stepIndex: 0,
      selectedRoleName: "Lead Communications Designer",
    });
    expect(text).toContain("Scene 1");
    expect(text).toContain("Build your station");
    expect(text).toContain("Make a communications desk");
    expect(text).toContain("Your part");
    expect(text).toContain("Label each station zone");
    expect(text).toContain("You could try");
    expect(text).toContain("Stack a radio");
    expect(text).toContain("Ready to move on when");
    expect(text.indexOf("Make a communications desk")).toBeLessThan(
      text.indexOf("Label each station zone")
    );
  });

  it("builds next scene from completed indexes", () => {
    const activity = {
      ...completeActivityV2Fixture,
      completedStepIndexes: [0],
    };
    const text = buildNarrationText(activity, "next");
    expect(text).toContain("Scene 2");
    expect(text).toContain("Write Earth's message");
    expect(text).toContain("Write or draw one message to Earth");
  });

  it("still reads simple step titles and doneWhen cues", () => {
    const activity = {
      ...completeActivityV2Fixture,
      activityStyle: "simple",
    };
    const text = buildNarrationText(activity, "step", { stepIndex: 0 });
    expect(text).toContain("Build your station");
    expect(text).toContain("You're done when");
  });

  it("builds stuck help from ifStuck prompts", () => {
    const text = buildNarrationText(completeActivityV2Fixture, "stuck", {
      stepIndex: 0,
      stuckPromptIndex: 0,
    });
    expect(text.length).toBeGreaterThan(0);
  });
});
