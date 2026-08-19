import { describe, expect, it } from "vitest";
import {
  deriveV1FieldsFromV2,
  normalizeActivity,
  normalizeStarterIdeas,
  normalizeStepDetails,
} from "./normalizeRequest.js";
import { normalizeActivityV3 } from "./normalizeActivityV3.js";
import { lostShellSignalV3Fixture } from "../../src/fixtures/lostShellSignalV3Fixture.js";

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
    expect(derived.roleGuide.childRoles).toEqual([]);
    expect(derived.ageFit.minAge).toBeLessThanOrEqual(derived.ageFit.maxAge);
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
    expect(details[0].instruction).toContain("Draw a comic panel.");
    expect(details[0].title).toBe("Step 1");
    expect(details[0].ifStuck).toBeTruthy();
    expect(details[0].starterIdeas).toEqual([]);
    expect(details[0].doneWhen).toBe("You have drawn a comic panel.");
    expect(details[0].doneWhen).not.toMatch(/finished this step/i);
  });

  it("synthesizes step starterIdeas from legacy examples", () => {
    const details = normalizeStepDetails(
      [
        {
          title: "Build station",
          instruction: "Set up a desk.",
          examples: ["Use books as radio.", "Claim the nearest chair."],
          doneWhen: "Desk is ready.",
          ifStuck: "Use a chair.",
          roleInstructions: [],
        },
      ],
      []
    );
    expect(details[0].starterIdeas).toHaveLength(2);
    expect(details[0].starterIdeas[0]).toMatchObject({
      example: "Use books as radio.",
      kind: "imagination",
    });
  });

  it("expands thin imaginative step labels while keeping specific doneWhen", () => {
    const details = normalizeStepDetails(
      [
        {
          title: "Open the embassy",
          instruction: "Set the greeting desk.",
          examples: ["Towel desk + Open sign."],
          doneWhen: "Desk and sign are ready.",
          ifStuck: "Use a chair seat as the desk.",
        },
      ],
      [],
      {
        activityStyle: "imaginative",
        uses: ["towel or placemat", "paper", "pencil"],
        roleGuide: { firstAction: "Set a towel as the embassy desk." },
      }
    );

    expect(details[0].instruction).toMatch(/towel/i);
    expect(details[0].instruction).not.toBe("Set the greeting desk.");
    expect(details[0].doneWhen).toBe("Desk and sign are ready.");
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
    expect(normalized.ageFit).toBeTruthy();
    expect(normalized.roleGuide.childRoles).toEqual([]);
  });

  it("normalizes ageFit and childRoles for mixed-age activities", () => {
    const normalized = normalizeActivity(
      {
        title: "Family Design Studio",
        activityStyle: "simple",
        theme: "Design",
        summary: "Build a shared project.",
        roleGuide: {
          name: "Studio Lead",
          description: "You guide the build.",
          goal: "Finish one shared model.",
          firstAction: "Pick the materials table.",
          childRoles: [
            {
              childName: "Sam",
              age: 6,
              roleTitle: "Parts Sorter",
              responsibility: "Sort bricks by color.",
              firstAction: "Make three color piles.",
            },
            {
              childName: "Alex",
              age: 13,
              roleTitle: "Lead Designer",
              responsibility: "Sketch the plan and assign build zones.",
              firstAction: "Draw a one-page blueprint.",
            },
          ],
        },
        ageFit: {
          minAge: 6,
          maxAge: 13,
          targetAges: [6, 13],
          maturityLevel: "mixed-age",
          independenceLevel: "some-help",
          ageFitReason: "Gives each sibling a real design role.",
        },
        starterIdeas: [],
        stepDetails: [],
        categories: ["building"],
        traits: {
          setupEffort: "low",
          structure: "guided",
          socialMode: "cooperative",
          creativity: "high",
          movement: "low",
        },
      },
      "simple",
      [6, 13]
    );

    expect(normalized.ageFit.minAge).toBe(6);
    expect(normalized.ageFit.maxAge).toBe(13);
    expect(normalized.roleGuide.childRoles).toHaveLength(2);
    expect(normalized.roles).toEqual(["Parts Sorter", "Lead Designer"]);
  });
});

describe("Activity Format V3 normalization", () => {
  it("keeps V3 and derives instruction from actions", () => {
    const normalized = normalizeActivity(lostShellSignalV3Fixture, "imaginative", [8]);
    expect(normalized.activityFormatVersion).toBe(3);
    expect(normalized.stepDetails[0].instruction).toContain("Walk slowly");
    expect(normalized.stepDetails[0].actions.length).toBe(6);
    expect(normalized.setupGuide.steps.length).toBeGreaterThan(0);
    expect(normalized.finishGuide.action).toBeTruthy();
    expect(normalized.extensionIdeas).toEqual(
      lostShellSignalV3Fixture.finishGuide.extensions
    );
  });

  it("does not duplicate legacy starter title and example", () => {
    const ideas = normalizeStarterIdeas(
      [{ title: "Same", example: "Same", kind: "imagination" }],
      ["Legacy prompt only"]
    );
    expect(ideas).toHaveLength(1);
    expect(ideas[0].title).toBe("");
    expect(ideas[0].example).toBe("Same");

    const legacyOnly = normalizeStarterIdeas([], ["Legacy prompt only"]);
    expect(legacyOnly[0].title).toBe("");
    expect(legacyOnly[0].example).toBe("Legacy prompt only");
  });
});
