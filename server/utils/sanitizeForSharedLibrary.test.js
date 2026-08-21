import { describe, expect, it } from "vitest";
import {
  classifySharedLibrarySafety,
  sanitizeForSharedLibrary,
} from "./sanitizeForSharedLibrary.js";

describe("sanitizeForSharedLibrary", () => {
  it("replaces personal child names with generic Player N roles", () => {
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
            childName: "Mia",
            childId: "c1",
            age: 6,
            roleTitle: "Scout",
            responsibility: "Look for clues.",
            firstAction: "Pick a badge.",
          },
          {
            childName: "Jordan",
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
    expect(sanitized.roleGuide.childRoles[0].childName).toBe("Player 1");
    expect(sanitized.roleGuide.childRoles[0].childId).toBeUndefined();
    expect(sanitized.roleGuide.childRoles[1].childName).toBe("Player 2");
    expect(sanitized.roleGuide.childRoles[0].roleTitle).toBe("Scout");
  });

  it("keeps generic Player names", () => {
    const sanitized = sanitizeForSharedLibrary({
      roleGuide: {
        name: "Lead",
        description: "Play",
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
    expect(sanitized.roleGuide.childRoles[0].childName).toBe("Player 1");
  });

  it("classifies personalized roles as unsafe", () => {
    const result = classifySharedLibrarySafety({
      roleGuide: {
        childRoles: [{ childName: "Sam", roleTitle: "Sorter" }],
      },
    });
    expect(result.status).toBe("unsafe-for-shared-cache");
  });
});
