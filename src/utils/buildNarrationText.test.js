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

  it("builds starter ideas narration", () => {
    const text = buildNarrationText(completeActivityV2Fixture, "starters");
    expect(text).toContain("starter ideas");
    expect(text).toContain("Message from Earth");
    expect(text).toContain("Robot trouble");
  });

  it("builds a single step script with doneWhen and starter ideas", () => {
    const text = buildNarrationText(completeActivityV2Fixture, "step", {
      stepIndex: 0,
    });
    expect(text).toContain("Build your station");
    expect(text).toContain("Make a communications desk");
    expect(text).toContain("You could try");
    expect(text).toContain("Stack a radio");
    expect(text).toContain("Ready for the next part when");
  });

  it("builds next step from completed indexes", () => {
    const activity = {
      ...completeActivityV2Fixture,
      completedStepIndexes: [0],
    };
    const text = buildNarrationText(activity, "next");
    expect(text).toContain("Write Earth's message");
  });

  it("builds stuck help from ifStuck prompts", () => {
    const text = buildNarrationText(completeActivityV2Fixture, "stuck", {
      stepIndex: 0,
      stuckPromptIndex: 0,
    });
    expect(text.length).toBeGreaterThan(0);
  });
});
