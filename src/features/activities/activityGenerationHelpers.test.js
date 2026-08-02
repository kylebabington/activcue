// src/features/activities/activityGenerationHelpers.test.js

import { describe, expect, it } from "vitest";
import {
  buildAutoStartFeedbackContext,
  buildKidBoredFeedbackContext,
  filterStartableActivities,
  getKidActivityStyleInstruction,
  getKidEnergyInstruction,
} from "./activityGenerationHelpers.js";

describe("getKidEnergyInstruction", () => {
  it("returns quiet guidance", () => {
    expect(getKidEnergyInstruction("quiet")).toMatch(/quiet/i);
  });

  it("returns energetic guidance", () => {
    expect(getKidEnergyInstruction("energetic")).toMatch(/extra energy/i);
  });

  it("returns neutral guidance by default", () => {
    expect(getKidEnergyInstruction("neutral")).toMatch(/neutral/i);
  });
});

describe("getKidActivityStyleInstruction", () => {
  it("marks imaginative intent", () => {
    expect(getKidActivityStyleInstruction("imaginative")).toMatch(
      /imaginative/
    );
  });

  it("marks simple intent", () => {
    expect(getKidActivityStyleInstruction("simple")).toMatch(/simple/);
  });
});

describe("buildKidBoredFeedbackContext", () => {
  it("includes style and energy", () => {
    const text = buildKidBoredFeedbackContext({
      kidActivityStyle: "simple",
      kidEnergyLevel: "quiet",
    });
    expect(text).toMatch(/activity style: simple/);
    expect(text).toMatch(/energy level: quiet/);
  });
});

describe("buildAutoStartFeedbackContext", () => {
  it("asks for automatic start options", () => {
    const text = buildAutoStartFeedbackContext({
      kidActivityStyle: "imaginative",
      kidEnergyLevel: "energetic",
    });
    expect(text).toMatch(/automatically/);
    expect(text).toMatch(/imaginative/);
  });
});

describe("filterStartableActivities", () => {
  const activities = [
    { id: "a", title: "Open", isLocked: false },
    { id: "b", title: "Locked", isLocked: true },
    { id: "c", title: "Redeemed", isLocked: true },
  ];

  it("keeps locked items before unlock is used", () => {
    expect(
      filterStartableActivities({
        activities,
        freeImaginativeUnlockUsed: false,
        freeImaginativeActivityId: null,
      })
    ).toHaveLength(3);
  });

  it("filters locked items after unlock unless they match redeemed id", () => {
    expect(
      filterStartableActivities({
        activities,
        freeImaginativeUnlockUsed: true,
        freeImaginativeActivityId: "c",
      }).map((item) => item.id)
    ).toEqual(["a", "c"]);
  });
});
