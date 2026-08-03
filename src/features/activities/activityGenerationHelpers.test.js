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
  it("returns structured energy intent", () => {
    expect(getKidEnergyInstruction("quiet")).toBe("energyLevel=quiet");
  });

  it("returns energetic intent", () => {
    expect(getKidEnergyInstruction("energetic")).toBe("energyLevel=energetic");
  });

  it("defaults to neutral", () => {
    expect(getKidEnergyInstruction("neutral")).toBe("energyLevel=neutral");
  });
});

describe("getKidActivityStyleInstruction", () => {
  it("marks imaginative intent", () => {
    expect(getKidActivityStyleInstruction("imaginative")).toBe(
      "activityStyle=imaginative"
    );
  });

  it("marks simple intent", () => {
    expect(getKidActivityStyleInstruction("simple")).toBe(
      "activityStyle=simple"
    );
  });
});

describe("buildKidBoredFeedbackContext", () => {
  it("includes structured style and energy", () => {
    const text = buildKidBoredFeedbackContext({
      kidActivityStyle: "simple",
      kidEnergyLevel: "quiet",
    });
    expect(text).toMatch(/generationMode=kid-bored/);
    expect(text).toMatch(/activityStyle=simple/);
    expect(text).toMatch(/energyLevel=quiet/);
  });
});

describe("buildAutoStartFeedbackContext", () => {
  it("asks for automatic start options via structured intent", () => {
    const text = buildAutoStartFeedbackContext({
      kidActivityStyle: "imaginative",
      kidEnergyLevel: "energetic",
    });
    expect(text).toMatch(/generationMode=auto-start/);
    expect(text).toMatch(/activityStyle=imaginative/);
    expect(text).toMatch(/energyLevel=energetic/);
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
