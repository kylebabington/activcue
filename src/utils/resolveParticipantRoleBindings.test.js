import { describe, expect, it } from "vitest";
import {
  buildInitialRoleAssignments,
  canonicalParticipantLabel,
  getBoundChildRoleNarration,
  getDisplayRoleCards,
  resolveParticipantRoleBindings,
} from "./resolveParticipantRoleBindings.js";

const cachedRoles = [
  {
    childName: "Child 1",
    age: 6,
    roleTitle: "Role A",
    responsibility: "Set the animals.",
    firstAction: "Pick a room.",
  },
  {
    childName: "Child 2",
    age: 8,
    roleTitle: "Role B",
    responsibility: "Build the base.",
    firstAction: "Stack the walls.",
  },
];

describe("canonicalParticipantLabel", () => {
  it("uses Child N in role order", () => {
    expect(canonicalParticipantLabel(0)).toBe("Child 1");
    expect(canonicalParticipantLabel(1)).toBe("Child 2");
  });
});

describe("resolveParticipantRoleBindings", () => {
  it("binds an exact-age family onto canonical slots without using names", () => {
    const family = [
      { id: "bertie", name: "Bertie", ageYears: 6 },
      { id: "charlie", name: "Charlie", ageYears: 8 },
    ];

    const { slotBindings, roleAssignments } = resolveParticipantRoleBindings({
      childRoles: cachedRoles,
      playingChildren: family,
    });

    expect(roleAssignments).toEqual({
      bertie: "Role A",
      charlie: "Role B",
    });
    expect(slotBindings.map((row) => row.childName)).toEqual([
      "Bertie",
      "Charlie",
    ]);
    expect(slotBindings.map((row) => row.participantLabel)).toEqual([
      "Child 1",
      "Child 2",
    ]);
  });

  it("reuses the same cached slots for a different family", () => {
    const family = [
      { id: "maya", name: "Maya", ageYears: 6 },
      { id: "theo", name: "Theo", ageYears: 8 },
    ];

    const { roleAssignments, slotBindings } = resolveParticipantRoleBindings({
      childRoles: cachedRoles,
      playingChildren: family,
    });

    expect(roleAssignments).toEqual({
      maya: "Role A",
      theo: "Role B",
    });
    expect(slotBindings.map((row) => row.childName).join(" ")).not.toMatch(
      /Bertie|Charlie/
    );
  });

  it("does not compare Child 1 to a real name", () => {
    const { roleAssignments } = resolveParticipantRoleBindings({
      childRoles: cachedRoles,
      playingChildren: [
        { id: "bertie", name: "Bertie", ageYears: 6 },
        { id: "charlie", name: "Charlie", ageYears: 8 },
      ],
    });

    expect(roleAssignments.bertie).toBe("Role A");
    expect(Object.values(roleAssignments)).not.toContain("Child 1");
  });

  it("assigns closest ages when exact ages are unavailable", () => {
    const { roleAssignments } = resolveParticipantRoleBindings({
      childRoles: [
        { childName: "Child 1", age: 6, roleTitle: "Younger Job" },
        { childName: "Child 2", age: 9, roleTitle: "Older Job" },
      ],
      playingChildren: [
        { id: "a", name: "A", ageYears: 7 },
        { id: "b", name: "B", ageYears: 10 },
      ],
    });

    expect(roleAssignments).toEqual({
      a: "Younger Job",
      b: "Older Job",
    });
  });

  it("still matches younger/older when children are listed oldest-first", () => {
    const { roleAssignments } = resolveParticipantRoleBindings({
      childRoles: [
        { childName: "Child 1", age: 6, roleTitle: "Younger Job" },
        { childName: "Child 2", age: 9, roleTitle: "Older Job" },
      ],
      playingChildren: [
        { id: "older", name: "Older", ageYears: 10 },
        { id: "younger", name: "Younger", ageYears: 7 },
      ],
    });

    expect(roleAssignments).toEqual({
      younger: "Younger Job",
      older: "Older Job",
    });
  });

  it("falls back to participant order when ages are missing", () => {
    const { roleAssignments } = resolveParticipantRoleBindings({
      childRoles: [
        { childName: "Child 1", roleTitle: "First Slot" },
        { childName: "Child 2", roleTitle: "Second Slot" },
      ],
      playingChildren: [
        { id: "maya", name: "Maya" },
        { id: "theo", name: "Theo" },
      ],
    });

    expect(roleAssignments).toEqual({
      maya: "First Slot",
      theo: "Second Slot",
    });
  });

  it("is deterministic when two children are equally close", () => {
    const first = resolveParticipantRoleBindings({
      childRoles: [
        { childName: "Child 1", age: 8, roleTitle: "Slot One" },
        { childName: "Child 2", age: 8, roleTitle: "Slot Two" },
      ],
      playingChildren: [
        { id: "left", name: "Left", ageYears: 7 },
        { id: "right", name: "Right", ageYears: 9 },
      ],
    });
    const second = resolveParticipantRoleBindings({
      childRoles: [
        { childName: "Child 1", age: 8, roleTitle: "Slot One" },
        { childName: "Child 2", age: 8, roleTitle: "Slot Two" },
      ],
      playingChildren: [
        { id: "left", name: "Left", ageYears: 7 },
        { id: "right", name: "Right", ageYears: 9 },
      ],
    });

    expect(first.roleAssignments).toEqual(second.roleAssignments);
    expect(first.roleAssignments).toEqual({
      left: "Slot One",
      right: "Slot Two",
    });
  });

  it("never assigns one child to two slots", () => {
    const { slotBindings } = resolveParticipantRoleBindings({
      childRoles: cachedRoles,
      playingChildren: [
        { id: "only", name: "Only", ageYears: 7 },
      ],
    });

    expect(slotBindings).toHaveLength(1);
    expect(slotBindings[0].childId).toBe("only");
    expect(slotBindings[0].roleTitle).toBe("Role A");
  });
});

describe("buildInitialRoleAssignments", () => {
  it("keeps bound titles and fills leftover children from fallback roles", () => {
    const assignments = buildInitialRoleAssignments({
      childRoles: cachedRoles,
      playingChildren: [
        { id: "bertie", name: "Bertie", ageYears: 6 },
        { id: "charlie", name: "Charlie", ageYears: 8 },
        { id: "extra", name: "Extra", ageYears: 10 },
      ],
      fallbackRoles: ["Role A", "Role B", "Helper"],
      fallbackRoleName: "Player",
    });

    expect(assignments).toEqual({
      bertie: "Role A",
      charlie: "Role B",
      extra: "Helper",
    });
  });
});

describe("getDisplayRoleCards", () => {
  it("shows current family names instead of Child 1 / Child 2", () => {
    const cards = getDisplayRoleCards({
      childRoles: cachedRoles,
      playingChildren: [
        { id: "bertie", name: "Bertie", ageYears: 6 },
        { id: "charlie", name: "Charlie", ageYears: 8 },
      ],
      roleAssignments: {
        bertie: "Role A",
        charlie: "Role B",
      },
    });

    expect(cards.map((card) => card.displayName)).toEqual(["Bertie", "Charlie"]);
    expect(cards.map((card) => card.roleTitle)).toEqual(["Role A", "Role B"]);
    expect(cards.some((card) => /Child \d/.test(card.displayName))).toBe(false);
  });

  it("honors manual dropdown reassignment", () => {
    const cards = getDisplayRoleCards({
      childRoles: cachedRoles,
      playingChildren: [
        { id: "bertie", name: "Bertie", ageYears: 6 },
        { id: "charlie", name: "Charlie", ageYears: 8 },
      ],
      roleAssignments: {
        bertie: "Role B",
        charlie: "Role A",
      },
    });

    expect(cards).toEqual([
      expect.objectContaining({ displayName: "Bertie", roleTitle: "Role B" }),
      expect.objectContaining({ displayName: "Charlie", roleTitle: "Role A" }),
    ]);
  });
});

describe("getBoundChildRoleNarration", () => {
  it("uses actual names for an active family session", () => {
    const lines = getBoundChildRoleNarration({
      childRoles: cachedRoles,
      playingChildren: [
        { id: "bertie", name: "Bertie", ageYears: 6 },
        { id: "charlie", name: "Charlie", ageYears: 8 },
      ],
      roleAssignments: {
        bertie: "Role A",
        charlie: "Role B",
      },
    });

    expect(lines.map((line) => line.name)).toEqual(["Bertie", "Charlie"]);
    expect(lines.some((line) => /Child \d/.test(line.name))).toBe(false);
  });
});
