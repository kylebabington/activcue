import { describe, expect, it } from "vitest";
import {
  deriveActivityModeFromPlayingChildIds,
  normalizeFamilySettingsDocument,
  resolvePlayingChildIds,
} from "./familySettingsDefaults";

describe("playingChildIds integrity", () => {
  const profiles = [
    { id: "c6", name: "Six", ageYears: 6 },
    { id: "c10", name: "Ten", ageYears: 10 },
    { id: "c13", name: "Thirteen", ageYears: 13 },
  ];

  it("derives single-child mode from one selected id", () => {
    expect(deriveActivityModeFromPlayingChildIds(["c6"])).toEqual({
      playingChildIds: ["c6"],
      activityMode: "single-child",
      activeChildId: "c6",
    });
  });

  it("derives family mode from two or more selected ids", () => {
    expect(deriveActivityModeFromPlayingChildIds(["c6", "c13"])).toEqual({
      playingChildIds: ["c6", "c13"],
      activityMode: "family",
      activeChildId: "",
    });
  });

  it("restores saved playing ids without selecting everyone in family mode", () => {
    const restored = resolvePlayingChildIds({
      playingChildIds: ["c6"],
      childProfiles: profiles,
      activityMode: "family",
      activeChildId: "",
    });
    expect(restored).toEqual(["c6"]);
  });

  it("does not expand missing playing ids to all children when mode is family", () => {
    const restored = resolvePlayingChildIds({
      playingChildIds: [],
      childProfiles: profiles,
      activityMode: "family",
      activeChildId: "",
    });
    expect(restored).toEqual([]);
  });

  it("normalizes settings so hydrate keeps only saved participants", () => {
    const normalized = normalizeFamilySettingsDocument({
      activityMode: "family",
      activeChildId: "",
      playingChildIds: ["c6"],
      childProfiles: profiles,
    });

    expect(normalized.playingChildIds).toEqual(["c6"]);
    expect(normalized.activityMode).toBe("single-child");
    expect(normalized.activeChildId).toBe("c6");
  });

  it("falls back to activeChildId for legacy rows without playingChildIds", () => {
    const normalized = normalizeFamilySettingsDocument({
      activityMode: "single-child",
      activeChildId: "c10",
      childProfiles: profiles,
    });

    expect(normalized.playingChildIds).toEqual(["c10"]);
    expect(normalized.activityMode).toBe("single-child");
    expect(normalized.activeChildId).toBe("c10");
  });
});
