import { describe, expect, it } from "vitest";
import { completeActivityV2Fixture } from "../fixtures/completeActivityV2Fixture";
import {
  ACTIVE_QUEST_STACK_ORDER,
  getSceneInstruction,
  getStepRoleParts,
  resolveDoneWhen,
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

  it("synthesizes a cue from a legacy instruction with no doneWhen", () => {
    expect(
      resolveDoneWhen({
        instruction: "Get paper and something to draw with.",
      })
    ).toBe("You have paper and something to draw with.");
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
