import { describe, expect, it } from "vitest";
import {
  deriveV1FieldsFromV2,
  normalizeActivity,
  normalizeStarterIdeas,
  normalizeStepDetails,
} from "./normalizeRequest.js";

describe("Activity Content V2 normalization", () => {
  it("derives V1 steps, prompts, and kidRole from V2 fields", () => {
    const derived = deriveV1FieldsFromV2({
      roleGuide: {
        name: "Communications Officer",
        description: "You control every message leaving the base.",
        goal: "Send three messages before night crew arrives.",
        firstAction: "Choose a desk spot.",
      },
      starterIdeas: [
        {
          title: "Message from Earth",
          example: "Earth says a rocket is late.",
          kind: "imagination",
        },
        {
          title: "Robot trouble",
          example: "Your robot brings wrong rocks.",
          kind: "choice",
        },
      ],
      stepDetails: [
        {
          title: "Build your station",
          instruction: "Make a communications desk.",
          examples: ["Stack books as a radio."],
          doneWhen: "You have a writing spot and a radio stand-in.",
          ifStuck: "Use a chair as the station.",
          roleInstructions: [],
        },
        {
          title: "Write Earth's message",
          instruction: "Write or draw one message to Earth.",
          examples: ["A rocket is late."],
          doneWhen: "One message is ready.",
          ifStuck: "Draw a simple picture message.",
          roleInstructions: [
            {
              roleName: "Evidence Keeper",
              instruction: "Copy the message onto the clue sheet.",
            },
          ],
        },
      ],
    });

    expect(derived.kidRole).toBe("Communications Officer");
    expect(derived.steps).toHaveLength(2);
    expect(derived.steps[0]).toContain("Build your station");
    expect(derived.starterPrompts[0]).toContain("rocket is late");
    expect(derived.roles).toEqual(["Communications Officer"]);
    expect(derived.stepDetails[1].roleInstructions[0].roleName).toBe(
      "Evidence Keeper"
    );
  });

  it("upgrades legacy V1 string steps into stepDetails", () => {
    const details = normalizeStepDetails(undefined, [
      "Draw a comic panel.",
      "Add speech bubbles.",
    ]);
    expect(details).toHaveLength(2);
    expect(details[0].instruction).toBe("Draw a comic panel.");
    expect(details[0].ifStuck).toBeTruthy();
  });

  it("upgrades legacy starterPrompts into starterIdeas", () => {
    const ideas = normalizeStarterIdeas(undefined, [
      "What weird feature does your ship have?",
    ]);
    expect(ideas).toHaveLength(1);
    expect(ideas[0].kind).toBe("imagination");
  });

  it("normalizeActivity always stamps activityFormatVersion 2 and visualTheme", () => {
    const normalized = normalizeActivity(
      {
        title: "Moon Base Message Mission",
        activityStyle: "imaginative",
        theme: "A quiet moon base waiting for urgent messages.",
        summary: "Send messages before night crew arrives.",
        kidRole: "",
        mission: "The base has gone almost silent.",
        roleGuide: {
          name: "Communications Officer",
          description: "You control messages.",
          goal: "Send three messages.",
          firstAction: "Pick a desk.",
        },
        starterIdeas: [
          {
            title: "Strange discovery",
            example: "Something shiny blinks by the pad.",
            kind: "imagination",
          },
        ],
        stepDetails: [
          {
            title: "Build station",
            instruction: "Set up a desk.",
            examples: ["Use books as radio."],
            doneWhen: "Desk is ready.",
            ifStuck: "Use a chair.",
            roleInstructions: [],
          },
        ],
        categories: ["pretend"],
        traits: {
          setupEffort: "low",
          structure: "guided",
          socialMode: "solo",
          creativity: "high",
          movement: "low",
        },
      },
      "imaginative"
    );

    expect(normalized.activityFormatVersion).toBe(2);
    expect(normalized.visualTheme).toBe("space");
    expect(normalized.kidRole).toBe("Communications Officer");
    expect(normalized.steps.length).toBeGreaterThan(0);
    expect(normalized.starterPrompts.length).toBeGreaterThan(0);
  });
});
