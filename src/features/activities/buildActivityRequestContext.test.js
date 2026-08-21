import { describe, expect, it } from "vitest";
import {
  buildActivityRequestContext,
  mergeSafetyAndMomentConstraints,
} from "./buildActivityRequestContext";

describe("buildActivityRequestContext", () => {
  const profiles = [
    {
      id: "c6",
      name: "Six",
      birthDate: "2020-01-01",
      interests: ["animals"],
      independenceLevel: "usually-independent",
    },
    {
      id: "c10",
      name: "Ten",
      birthDate: "2016-01-01",
      interests: ["building"],
    },
    {
      id: "c13",
      name: "Thirteen",
      birthDate: "2013-01-01",
    },
  ];

  it("snapshots only playingChildIds even if mode says family", () => {
    const ctx = buildActivityRequestContext({
      playingChildIds: ["c6"],
      childProfiles: profiles,
      activityMode: "family",
      kidActivityStyle: "imaginative",
      kidEnergyLevel: "quiet",
      currentMoment: {
        parentActivity: "Cooking dinner",
        timeNeededMinutes: 20,
        space: "Kitchen table",
        messLevel: "low",
        noiseLevel: "quiet",
        supervisionLevel: "independent",
      },
      safetySettings: {
        screenFreeOnly: true,
        noWaterPlay: true,
        noSmallObjects: true,
        maxActivityMinutes: 30,
      },
    });

    expect(ctx.participants.participantCount).toBe(1);
    expect(ctx.participants.mode).toBe("single-child");
    expect(ctx.participants.children[0].id).toBe("c6");
    expect(ctx.activity.style).toBe("imaginative");
    expect(ctx.activity.energyLevel).toBe("quiet");
    expect(ctx.moment.timeNeededMinutes).toBe(20);
    expect(ctx.safety.quietMode).toBe(true);
    expect(ctx.safety.noWaterPlay).toBe(true);
  });

  it("uses generationIntent style/energy over loose state", () => {
    const ctx = buildActivityRequestContext({
      playingChildIds: ["c6"],
      childProfiles: profiles,
      kidActivityStyle: "simple",
      kidEnergyLevel: "neutral",
      generationIntent: {
        activityStyle: "imaginative",
        energyLevel: "quiet",
        generationMode: "kid-bored",
      },
      currentMoment: { timeNeededMinutes: 15 },
    });
    expect(ctx.activity.style).toBe("imaginative");
    expect(ctx.activity.energyLevel).toBe("quiet");
  });
});

describe("mergeSafetyAndMomentConstraints", () => {
  it("takes the stricter duration and quiet flags", () => {
    const merged = mergeSafetyAndMomentConstraints({
      safetySettings: {
        quietMode: false,
        maxActivityMinutes: 30,
        adultHelpAllowed: "optional",
      },
      currentMoment: {
        timeNeededMinutes: 20,
        noiseLevel: "quiet",
        messLevel: "low",
        supervisionLevel: "independent",
      },
      activityPreferences: { messTolerance: "fine-with-mess" },
    });
    expect(merged.maxActivityMinutes).toBe(20);
    expect(merged.quietMode).toBe(true);
    expect(merged.messLevel).toBe("low");
    expect(merged.adultHelpAllowed).toBe("independent");
  });
});
