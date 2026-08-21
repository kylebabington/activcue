/**
 * E2E-style acceptance for participant persistence (unit-level mirror).
 * Full browser refresh coverage lives in e2e/ when auth fixtures are available.
 */
import { describe, expect, it } from "vitest";
import {
  deriveActivityModeFromPlayingChildIds,
  normalizeFamilySettingsDocument,
} from "../../src/constants/familySettingsDefaults.js";

describe("participant persistence acceptance", () => {
  it("selecting only age-6 survives normalize/hydrate for a 6/10/13 household", () => {
    const profiles = [
      { id: "c6", name: "Six", birthDate: "2020-01-01" },
      { id: "c10", name: "Ten", birthDate: "2016-01-01" },
      { id: "c13", name: "Thirteen", birthDate: "2013-01-01" },
    ];

    const saved = normalizeFamilySettingsDocument({
      activityMode: "family",
      activeChildId: "",
      playingChildIds: ["c6"],
      childProfiles: profiles,
    });

    expect(saved.playingChildIds).toEqual(["c6"]);
    expect(saved.activityMode).toBe("single-child");
    expect(saved.activeChildId).toBe("c6");

    const derived = deriveActivityModeFromPlayingChildIds(saved.playingChildIds);
    expect(derived.activityMode).toBe("single-child");
    expect(derived.playingChildIds).toHaveLength(1);
  });
});
