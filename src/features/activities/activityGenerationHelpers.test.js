// src/features/activities/activityGenerationHelpers.test.js

import { describe, expect, it } from "vitest";
import { filterStartableActivities } from "./activityGenerationHelpers.js";
import {
  buildAutoStartIntent,
  buildKidBoredIntent,
} from "./activityIntent.js";

describe("structured generation intents", () => {
  it("builds kid-bored intent with style and energy", () => {
    expect(
      buildKidBoredIntent({
        kidActivityStyle: "simple",
        kidEnergyLevel: "quiet",
      })
    ).toEqual({
      activityStyle: "simple",
      energyLevel: "quiet",
      generationMode: "kid-bored",
    });
  });

  it("builds auto-start intent with style and energy", () => {
    expect(
      buildAutoStartIntent({
        kidActivityStyle: "imaginative",
        kidEnergyLevel: "energetic",
      })
    ).toEqual({
      activityStyle: "imaginative",
      energyLevel: "energetic",
      generationMode: "auto-start",
    });
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
