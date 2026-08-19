import { describe, expect, it } from "vitest";
import { completeActivityV2Fixture } from "../fixtures/completeActivityV2Fixture";
import {
  ACTIVE_QUEST_STACK_ORDER,
  getSceneInstruction,
  getStepRoleParts,
  resolveDoneWhen,
  resolveIfStuck,
  resolveSceneInstruction,
} from "./questStepCopy";

describe("resolveDoneWhen", () => {
  it("keeps a specific completion cue", () => {
    expect(
      resolveDoneWhen({
        instruction: "Draw 3–5 zones.",
        doneWhen: "Every zone has a name you can point to.",
      })
    ).toBe("Every zone has a name you can point to.");
  });

  it("replaces generic finish-this-step copy with the actual action", () => {
    expect(
      resolveDoneWhen({
        title: "Draw the zones",
        instruction: "Draw 3–5 zones on the paper and name each one.",
        doneWhen: "You finished this step.",
      })
    ).toBe("You have drawn 3–5 zones on the paper.");
  });

  it("rewrites generic ifStuck copy from the step action", () => {
    expect(
      resolveIfStuck({
        instruction: "Create your circus name and costume.",
        ifStuck: "Do a simpler version of this step and move on.",
      })
    ).toBe("Try the easiest piece first: Create your circus name and costume.");
  });
});

describe("resolveSceneInstruction", () => {
  it("turns a thin cached scene into a how-to an 8-year-old can follow", () => {
    const instruction = resolveSceneInstruction(
      {
        title: "Open the embassy",
        instruction: "Set the greeting desk.",
        examples: ["Towel desk + Open sign."],
        ifStuck: "Use a chair seat as the desk.",
      },
      {
        activityStyle: "imaginative",
        uses: ["stuffed animals", "paper", "pencil", "towel or placemat"],
        roleGuide: { firstAction: "Set a towel as the embassy desk." },
      },
      0
    );

    expect(instruction).toMatch(/towel/i);
    expect(instruction).toMatch(/open sign/i);
    expect(instruction).toMatch(/chair|desk/i);
    expect(instruction).not.toBe("Set the greeting desk.");
    expect(
      instruction.split(/[.!?]+/).filter((part) => part.trim()).length
    ).toBeGreaterThanOrEqual(3);
  });

  it("leaves a specific multi-sentence instruction alone", () => {
    const full =
      "Find a towel, placemat, or chair and turn it into the embassy greeting desk. Put paper and a pencil on it so diplomats can check in. Make an Open sign, or write OPEN on scrap paper. If you do not have a table, use a chair seat or the floor.";
    expect(
      resolveSceneInstruction(
        { title: "Open the embassy", instruction: full },
        { activityStyle: "imaginative" }
      )
    ).toBe(full);
  });

  it("does not expand simple activities", () => {
    expect(
      resolveSceneInstruction(
        { instruction: "Get paper and something to draw with." },
        { activityStyle: "simple" }
      )
    ).toBe("Get paper and something to draw with.");
  });

  it("keeps another activity on its own objects, not an embassy desk", () => {
    const instruction = resolveSceneInstruction(
      {
        title: "Map the jungle",
        instruction: "Draw paths between landmarks.",
        examples: ["Chair to door to lamp."],
        ifStuck: "Draw the shortest path first.",
      },
      {
        activityStyle: "imaginative",
        uses: ["paper", "pencil", "pillows"],
        roleGuide: { firstAction: "Set a towel as the embassy desk." },
      },
      1
    );

    expect(instruction).toMatch(/path|landmark|chair/i);
    expect(instruction).not.toMatch(
      /embassy|diplomat|greeting desk|open sign|towel/i
    );
  });
});

const step = completeActivityV2Fixture.stepDetails[0];

describe("getSceneInstruction", () => {
  it("always returns the full scene instruction, never a role line", () => {
    expect(getSceneInstruction(step)).toBe("Make a communications desk.");
    expect(getSceneInstruction(step)).not.toContain(
      "Label each station zone"
    );
  });
});

describe("getStepRoleParts", () => {
  it("keeps role copy supplemental instead of replacing the scene", () => {
    const parts = getStepRoleParts(step, {
      childRoles: completeActivityV2Fixture.roleGuide.childRoles,
      selectedRoleName: "Lead Communications Designer",
    });

    expect(getSceneInstruction(step)).toBe("Make a communications desk.");
    expect(parts).toEqual([
      {
        childName: "Alex",
        roleName: "Lead Communications Designer",
        instruction: "Label each station zone on a scrap of paper.",
      },
    ]);
  });

  it("uses assigned children when family roles are set", () => {
    const parts = getStepRoleParts(step, {
      playingChildren: [
        { id: "alex", name: "Alex" },
        { id: "sam", name: "Sam" },
      ],
      roleAssignments: {
        alex: "Lead Communications Designer",
        sam: "Signal Runner",
      },
      childRoles: completeActivityV2Fixture.roleGuide.childRoles,
    });

    expect(parts).toEqual([
      {
        childName: "Alex",
        roleName: "Lead Communications Designer",
        instruction: "Label each station zone on a scrap of paper.",
      },
    ]);
  });
});

describe("ACTIVE_QUEST_STACK_ORDER", () => {
  it("puts the story and current scene before supporting cards on mobile", () => {
    expect(ACTIVE_QUEST_STACK_ORDER).toEqual([
      "story",
      "stage",
      "roles",
      "supplies",
      "starters",
      "finish",
      "other",
    ]);
  });
});
