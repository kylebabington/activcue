import { describe, expect, it } from "vitest";
import { computeActivityContentHash } from "../lib/sharedActivityLibrary.js";
import {
  classifySharedLibrarySafety,
  sanitizeForSharedLibrary,
} from "./sanitizeForSharedLibrary.js";

describe("sanitizeForSharedLibrary", () => {
  it("replaces personal child names with canonical Child N slots", () => {
    const sanitized = sanitizeForSharedLibrary({
      title: "Sibling Rescue HQ",
      whyItFits: "Because Mia loves animals",
      presentedAt: "2026-08-01",
      childId: "abc",
      roleGuide: {
        name: "HQ Lead",
        description: "Run the station.",
        childRoles: [
          {
            childName: "Bertie",
            childId: "c1",
            age: 6,
            roleTitle: "Scout",
            responsibility: "Look for clues.",
            firstAction: "Pick a badge.",
          },
          {
            childName: "Charlie",
            age: 10,
            roleTitle: "Dispatcher",
            responsibility: "Send messages.",
            firstAction: "Open the radio.",
          },
        ],
      },
    });

    expect(sanitized.whyItFits).toBeUndefined();
    expect(sanitized.presentedAt).toBeUndefined();
    expect(sanitized.childId).toBeUndefined();
    expect(sanitized.roleGuide.childRoles[0].childName).toBe("Child 1");
    expect(sanitized.roleGuide.childRoles[0].childId).toBeUndefined();
    expect(sanitized.roleGuide.childRoles[1].childName).toBe("Child 2");
    expect(sanitized.roleGuide.childRoles[0].roleTitle).toBe("Scout");
    expect(JSON.stringify(sanitized)).not.toMatch(/Bertie|Charlie|Mia/);
  });

  it("normalizes generic Player/Kid/Sibling labels to Child N by order", () => {
    const sanitized = sanitizeForSharedLibrary({
      roleGuide: {
        name: "Lead",
        description: "Play",
        childRoles: [
          {
            childName: "Player 1",
            age: 6,
            roleTitle: "Scout",
            responsibility: "Look",
            firstAction: "Go",
          },
          {
            childName: "Kid 2",
            age: 8,
            roleTitle: "Builder",
            responsibility: "Build",
            firstAction: "Start",
          },
          {
            childName: "Sibling 1",
            age: 10,
            roleTitle: "Checker",
            responsibility: "Check",
            firstAction: "Verify",
          },
        ],
      },
    });
    expect(sanitized.roleGuide.childRoles.map((role) => role.childName)).toEqual([
      "Child 1",
      "Child 2",
      "Child 3",
    ]);
  });

  it("keeps role metadata while canonicalizing identity labels", () => {
    const sanitized = sanitizeForSharedLibrary({
      roleGuide: {
        childRoles: [
          {
            childName: "Player 1",
            age: 7,
            roleTitle: "Builder",
            responsibility: "Build",
            firstAction: "Start",
          },
        ],
      },
    });
    expect(sanitized.roleGuide.childRoles[0]).toEqual({
      childName: "Child 1",
      age: 7,
      roleTitle: "Builder",
      responsibility: "Build",
      firstAction: "Start",
    });
  });

  it("makes Player 1 and Child 1 hash identically after sanitization", () => {
    const activityShape = {
      activityFormatVersion: 4,
      title: "Shared Station",
      activityStyle: "imaginative",
      story: "A station needs two jobs.",
      roleGuide: {
        name: "Station Lead",
        description: "Run the station together.",
        childRoles: [
          {
            age: 6,
            roleTitle: "Scout",
            responsibility: "Look",
            firstAction: "Go",
          },
          {
            age: 8,
            roleTitle: "Lead",
            responsibility: "Plan",
            firstAction: "Map",
          },
        ],
      },
    };
    const fromPlayer = sanitizeForSharedLibrary({
      ...activityShape,
      roleGuide: {
        ...activityShape.roleGuide,
        childRoles: activityShape.roleGuide.childRoles.map((role, index) => ({
          ...role,
          childName: `Player ${index + 1}`,
        })),
      },
    });
    const fromChild = sanitizeForSharedLibrary({
      ...activityShape,
      roleGuide: {
        ...activityShape.roleGuide,
        childRoles: activityShape.roleGuide.childRoles.map((role, index) => ({
          ...role,
          childName: `Child ${index + 1}`,
        })),
      },
    });

    expect(fromPlayer.roleGuide.childRoles[0].childName).toBe("Child 1");
    expect(computeActivityContentHash(fromPlayer)).toBe(
      computeActivityContentHash(fromChild)
    );
  });

  it("classifies personalized roles as unsafe before sanitization", () => {
    const result = classifySharedLibrarySafety({
      roleGuide: {
        childRoles: [{ childName: "Sam", roleTitle: "Sorter" }],
      },
    });
    expect(result.status).toBe("unsafe-for-shared-cache");
  });
});
