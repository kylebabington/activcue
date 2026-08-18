import { describe, expect, it } from "vitest";
import { completeActivityV2Fixture } from "../fixtures/completeActivityV2Fixture";
import {
  ACTIVE_QUEST_STACK_ORDER,
  getSceneInstruction,
  getStepRoleParts,
} from "./questStepCopy";

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
