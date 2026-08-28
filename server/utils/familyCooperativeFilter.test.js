import { describe, expect, it } from "vitest";
import { filterActivitiesByFitPolicy } from "./activityFitPolicy.js";

function familyRequest() {
  return {
    participants: {
      mode: "family",
      participantCount: 2,
      children: [{ ageYears: 6 }, { ageYears: 8 }],
      childrenContext: [{ ageYears: 6 }, { ageYears: 8 }],
    },
    activity: { style: "imaginative", energyLevel: "quiet" },
    moment: {
      timeNeededMinutes: 20,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "independent",
    },
    safety: {
      screenFreeOnly: true,
      noWaterPlay: true,
      noSmallObjects: true,
      noFoodActivities: false,
      maxActivityMinutes: 20,
      adultHelpAllowed: "independent",
      quietMode: true,
    },
    inventory: [{ name: "paper" }],
  };
}

function cooperativeActivity(title) {
  return {
    title,
    activityStyle: "imaginative",
    estimatedMinutes: 15,
    mess: "low",
    energy: "calm",
    adultHelp: "none",
    uses: ["paper"],
    traits: { socialMode: "cooperative" },
    ageFit: {
      minAge: 5,
      maxAge: 10,
      targetAges: [6, 8],
      maturityLevel: "child",
    },
    roleGuide: {
      name: "Team",
      description: "Work together.",
      childRoles: [
        { childName: "A", age: 6, roleTitle: "Sorter", responsibility: "Sort", firstAction: "Pick" },
        { childName: "B", age: 8, roleTitle: "Checker", responsibility: "Check", firstAction: "Verify" },
      ],
    },
    stepDetails: [
      {
        title: "Sort",
        actions: ["Pick five items.", "Line them up.", "Count them."],
        doneWhen: "Five items are lined up.",
        starterIdeas: [],
        ifStuck: "Use three items.",
        roleInstructions: [],
      },
      {
        title: "Check",
        actions: ["Point to each item.", "Say its color.", "Mark a tally."],
        doneWhen: "Tally is marked.",
        starterIdeas: [],
        ifStuck: "Mark two tallies.",
        roleInstructions: [],
      },
    ],
  };
}

describe("family cooperative filter regression", () => {
  it("returns three valid cooperative activities without participant rejects", () => {
    const activities = [
      cooperativeActivity("Team Sort A"),
      cooperativeActivity("Team Sort B"),
      cooperativeActivity("Team Sort C"),
    ];
    const filtered = filterActivitiesByFitPolicy(activities, familyRequest());
    expect(filtered.activities).toHaveLength(3);
    expect(filtered.summary.rejectedByReason["participant-count-mismatch"] || 0).toBe(
      0
    );
  });
});
