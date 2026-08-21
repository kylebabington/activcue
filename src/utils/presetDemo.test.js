import { describe, expect, it } from "vitest";
import {
  getEligiblePresets,
  isFreeImaginativeUnlockUsed,
  takeRotatedOne,
  takeRotatedSlice,
} from "./presetDemo";

describe("presetDemo", () => {
  it("detects free imaginative unlock used", () => {
    expect(isFreeImaginativeUnlockUsed({})).toBe(false);
    expect(
      isFreeImaginativeUnlockUsed({ freeImaginativeActivityId: "abc" })
    ).toBe(true);
  });

  it("filters eligible simple and imaginative presets", () => {
    const activities = [
      { id: "s1", activityStyle: "simple", isLocked: false },
      { id: "i1", activityStyle: "imaginative", isLocked: true },
      { id: "i2", activityStyle: "imaginative", isLocked: false },
    ];

    expect(getEligiblePresets(activities, "simple", {}).length).toBe(1);
    expect(getEligiblePresets(activities, "imaginative", {}).length).toBe(2);
    expect(
      getEligiblePresets(activities, "imaginative", {
        freeImaginativeActivityId: "i2",
      }).map((a) => a.id)
    ).toEqual(["i2"]);
  });

  it("excludes multi-role presets for a single selected child", () => {
    const activities = [
      {
        id: "solo",
        activityStyle: "simple",
        isLocked: false,
        ageFit: { minAge: 4, maxAge: 10 },
        roleGuide: { childRoles: [{ name: "Artist" }] },
      },
      {
        id: "duo",
        activityStyle: "simple",
        isLocked: false,
        ageFit: { minAge: 4, maxAge: 10 },
        roleGuide: {
          childRoles: [{ name: "Builder" }, { name: "Decorator" }],
        },
      },
      {
        id: "group",
        activityStyle: "simple",
        isLocked: false,
        ageFit: { minAge: 4, maxAge: 10 },
        participantMode: "group",
        participantMin: 2,
      },
    ];

    const eligible = getEligiblePresets(activities, "simple", {}, [
      { ageYears: 6 },
    ]);
    expect(eligible.map((a) => a.id)).toEqual(["solo"]);
  });

  it("rotates slices and wraps", () => {
    const items = ["a", "b", "c", "d"];
    const first = takeRotatedSlice(items, 0, 3);
    expect(first.slice).toEqual(["a", "b", "c"]);
    expect(first.nextIndex).toBe(3);

    const second = takeRotatedSlice(items, first.nextIndex, 3);
    expect(second.slice).toEqual(["d", "a", "b"]);
    expect(second.nextIndex).toBe(2);

    const one = takeRotatedOne(items, 2);
    expect(one.activity).toBe("c");
    expect(one.nextIndex).toBe(3);
  });
});
