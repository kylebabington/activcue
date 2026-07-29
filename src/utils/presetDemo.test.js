/**
 * Unit checks for unpaid/demo preset rotation helpers.
 * Run: node --test src/utils/presetDemo.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getEligiblePresets,
  isFreeImaginativeUnlockUsed,
  takeRotatedOne,
  takeRotatedSlice,
} from "./presetDemo.js";

describe("presetDemo", () => {
  it("detects free imaginative unlock used", () => {
    assert.equal(isFreeImaginativeUnlockUsed({}), false);
    assert.equal(
      isFreeImaginativeUnlockUsed({ freeImaginativeActivityId: "abc" }),
      true
    );
  });

  it("filters eligible simple and imaginative presets", () => {
    const activities = [
      { id: "s1", activityStyle: "simple", isLocked: false },
      { id: "i1", activityStyle: "imaginative", isLocked: true },
      { id: "i2", activityStyle: "imaginative", isLocked: false },
    ];

    assert.equal(
      getEligiblePresets(activities, "simple", {}).length,
      1
    );
    assert.equal(
      getEligiblePresets(activities, "imaginative", {}).length,
      2
    );
    assert.deepEqual(
      getEligiblePresets(activities, "imaginative", {
        freeImaginativeActivityId: "i2",
      }).map((a) => a.id),
      ["i2"]
    );
  });

  it("rotates slices and wraps", () => {
    const items = ["a", "b", "c", "d"];
    const first = takeRotatedSlice(items, 0, 3);
    assert.deepEqual(first.slice, ["a", "b", "c"]);
    assert.equal(first.nextIndex, 3);

    const second = takeRotatedSlice(items, first.nextIndex, 3);
    assert.deepEqual(second.slice, ["d", "a", "b"]);
    assert.equal(second.nextIndex, 2);

    const one = takeRotatedOne(items, 2);
    assert.equal(one.activity, "c");
    assert.equal(one.nextIndex, 3);
  });
});
