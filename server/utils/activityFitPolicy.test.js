import { describe, expect, it } from "vitest";
import { evaluateActivityFit } from "./activityFitPolicy.js";

function baseRequest(overrides = {}) {
  return {
    participants: {
      mode: "single-child",
      participantCount: 1,
      children: [
        {
          id: "c6",
          name: "Six",
          ageYears: 6,
          interests: ["animals"],
        },
      ],
      childrenContext: [{ name: "Six", ageYears: 6 }],
    },
    activity: { style: "imaginative", energyLevel: "quiet" },
    moment: {
      timeNeededMinutes: 20,
      space: "Kitchen table",
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
    inventory: [{ name: "paper" }, { name: "pencil" }],
    ...overrides,
  };
}

function baseActivity(overrides = {}) {
  return {
    title: "Animal Post Office",
    activityStyle: "imaginative",
    estimatedMinutes: 15,
    mess: "low",
    energy: "calm",
    adultHelp: "none",
    uses: ["paper", "pencil"],
    ageFit: {
      minAge: 5,
      maxAge: 8,
      targetAges: [6, 7],
      maturityLevel: "child",
    },
    roleGuide: {
      name: "Postal Clerk",
      description: "You sort animal letters.",
      childRoles: [],
    },
    stepDetails: [
      {
        title: "Make a stamp",
        instruction: "Draw a stamp on paper.",
        doneWhen: "A stamp is drawn.",
      },
      {
        title: "Deliver",
        instruction: "Walk the letter to a chair mailbox.",
        doneWhen: "Letter is delivered.",
      },
    ],
    ...overrides,
  };
}

describe("evaluateActivityFit", () => {
  it("accepts a quiet single-child imaginative match", () => {
    const result = evaluateActivityFit(baseActivity(), baseRequest());
    expect(result.eligible).toBe(true);
    expect(result.hardFailures).toEqual([]);
  });

  it("rejects group-only activities for one child", () => {
    const result = evaluateActivityFit(
      baseActivity({
        title: "Sibling Rescue HQ",
        roleGuide: {
          name: "HQ",
          description: "Two roles",
          childRoles: [
            {
              childName: "Player 1",
              age: 6,
              roleTitle: "Scout",
              responsibility: "Look",
              firstAction: "Go",
            },
            {
              childName: "Player 2",
              age: 10,
              roleTitle: "Lead",
              responsibility: "Plan",
              firstAction: "Map",
            },
          ],
        },
        participant_mode: "group",
        participant_min: 2,
        participant_max: 4,
      }),
      baseRequest()
    );
    expect(result.eligible).toBe(false);
    expect(result.hardFailures).toContain("participant-count-mismatch");
  });

  it("rejects water play when noWaterPlay is set", () => {
    const result = evaluateActivityFit(
      baseActivity({
        title: "Sink Splash Lab",
        summary: "Splash water in the sink",
        stepDetails: [
          {
            title: "Splash",
            instruction: "Fill a cup with water and splash.",
            doneWhen: "Water splashed.",
          },
        ],
      }),
      baseRequest()
    );
    expect(result.eligible).toBe(false);
    expect(result.hardFailures).toContain("no-water");
  });

  it("rejects activities over the hard minute limit without +5 tolerance", () => {
    const result = evaluateActivityFit(
      baseActivity({ estimatedMinutes: 25 }),
      baseRequest()
    );
    expect(result.eligible).toBe(false);
    expect(result.hardFailures).toContain("time-limit");
  });

  it("rejects loud activities when quiet is required", () => {
    const result = evaluateActivityFit(
      baseActivity({
        energy: "high",
        title: "Loud Stomp Parade",
        summary: "A loud stomping parade",
      }),
      baseRequest()
    );
    expect(result.eligible).toBe(false);
    expect(result.hardFailures).toContain("noise-limit");
  });
});
