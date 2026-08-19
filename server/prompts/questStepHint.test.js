import { describe, expect, it } from "vitest";
import {
  buildQuestStepHintInput,
  buildQuestStepHintInstructions,
} from "./questStepHint.js";

describe("quest step hint prompt", () => {
  it("requires a concrete action for this scene and bans generic easier-copy", () => {
    const instructions = buildQuestStepHintInstructions();
    expect(instructions).toMatch(/this (scene|step)/i);
    expect(instructions).toMatch(/simpler version/i);
    expect(instructions).toMatch(/try something easier/i);
  });

  it("includes the current scene title, instruction, and previous hints", () => {
    const input = buildQuestStepHintInput({
      activeActivity: {
        title: "Living Room Circus Show",
        theme: "Circus",
        mission: "Put on a three-part circus show.",
        uses: ["blankets", "dress-up clothes"],
      },
      currentStep: "Create your circus name and costume.",
      currentStepTitle: "Create your circus name and costume.",
      currentStepInstruction:
        "Make a circus name and put on a costume from dress-up clothes.",
      currentStepNumber: 1,
      totalSteps: 4,
      starterIdeas: [
        { title: "Circus name", example: "The Sparkle Tent" },
      ],
      previousHints: ["Use a towel as a cape."],
      safeCurrentMoment: { noiseLevel: "quiet" },
      activeChildProfile: { name: "Sam" },
      inventory: ["blankets", "hats"],
    });

    expect(input).toContain("Create your circus name and costume");
    expect(input).toContain("The Sparkle Tent");
    expect(input).toContain("Use a towel as a cape.");
    expect(input).toContain("blankets");
  });
});
