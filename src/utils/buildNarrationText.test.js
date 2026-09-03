import { describe, expect, it } from "vitest";
import { completeActivityV2Fixture } from "../fixtures/completeActivityV2Fixture";
import { lostShellSignalV3Fixture } from "../fixtures/lostShellSignalV3Fixture";
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

  it("uses current family names in role narration instead of Child 1 slots", () => {
    const activity = {
      ...completeActivityV2Fixture,
      roleGuide: {
        ...completeActivityV2Fixture.roleGuide,
        childRoles: [
          {
            childName: "Child 1",
            age: 6,
            roleTitle: "Animal Room Setter",
            responsibility: "Choose animal rooms.",
            firstAction: "Pick a pillow bed.",
          },
          {
            childName: "Child 2",
            age: 8,
            roleTitle: "Base Shape Builder",
            responsibility: "Build the walls.",
            firstAction: "Stack the blocks.",
          },
        ],
      },
    };
    const playingChildren = [
      { id: "bertie", name: "Bertie", ageYears: 6 },
      { id: "charlie", name: "Charlie", ageYears: 8 },
    ];
    const roleAssignments = {
      bertie: "Animal Room Setter",
      charlie: "Base Shape Builder",
    };

    const text = buildNarrationText(activity, "role", {
      playingChildren,
      roleAssignments,
    });

    expect(text).toContain("Bertie is the Animal Room Setter");
    expect(text).toContain("Charlie is the Base Shape Builder");
    expect(text).not.toContain("Child 1");
    expect(text).not.toContain("Child 2");
  });

  it("uses current family names in step role narration", () => {
    const activity = {
      ...completeActivityV2Fixture,
      roleGuide: {
        ...completeActivityV2Fixture.roleGuide,
        childRoles: [
          { childName: "Child 1", age: 6, roleTitle: "Animal Room Setter" },
          { childName: "Child 2", age: 8, roleTitle: "Base Shape Builder" },
        ],
      },
      stepDetails: [
        {
          ...completeActivityV2Fixture.stepDetails[0],
          roleInstructions: [
            {
              roleName: "Animal Room Setter",
              instruction: "Choose where the animals should rest.",
            },
            {
              roleName: "Base Shape Builder",
              instruction: "Build the walls and paths.",
            },
          ],
        },
        ...completeActivityV2Fixture.stepDetails.slice(1),
      ],
    };

    const text = buildNarrationText(activity, "step", {
      stepIndex: 0,
      playingChildren: [
        { id: "bertie", name: "Bertie", ageYears: 6 },
        { id: "charlie", name: "Charlie", ageYears: 8 },
      ],
      roleAssignments: {
        bertie: "Animal Room Setter",
        charlie: "Base Shape Builder",
      },
    });

    expect(text).toContain("Bertie");
    expect(text).toContain("Charlie");
    expect(text).not.toContain("Child 1");
    expect(text).not.toContain("Child 2");
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
    expect(text).toContain("Stack books as a radio");
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

  it("includes storyBeat before actions and resolution before finish action for V3", () => {
    const stepText = buildNarrationText(lostShellSignalV3Fixture, "step", {
      stepIndex: 0,
    });
    expect(stepText).toContain("The first clue has washed up alone");
    expect(stepText.indexOf("The first clue has washed up alone")).toBeLessThan(
      stepText.indexOf("Walk slowly")
    );

    const finishText = buildNarrationText(lostShellSignalV3Fixture, "finish");
    expect(finishText).toContain("three clues now spell out");
    expect(finishText.indexOf("three clues now spell out")).toBeLessThan(
      finishText.indexOf("Put all three clues")
    );
  });
});
