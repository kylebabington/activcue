/**
 * Recommendation integrity regression coverage:
 * - single-child never gets multi-role activities
 * - safety hard rejects
 * - cache-style fit policy without OpenAI
 */
import { describe, expect, it } from "vitest";
import { evaluateActivityFit } from "./activityFitPolicy.js";
import { resolveParticipantContext } from "./participantContext.js";
import { buildSanitizedGenerationContext } from "./sanitizedGenerationContext.js";

function requestForAges(ages, extras = {}) {
  const children = ages.map((ageYears, index) => ({
    id: `c${ageYears}`,
    name: `Child${index + 1}`,
    ageYears,
    interests: ["animals"],
  }));
  return {
    participants: {
      mode: ages.length >= 2 ? "family" : "single-child",
      participantCount: ages.length,
      children,
      childrenContext: children,
      ages,
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
    inventory: [{ name: "paper" }],
    ...extras,
  };
}

const seedA = {
  title: "Animal Post Office",
  activityStyle: "imaginative",
  estimatedMinutes: 15,
  mess: "low",
  energy: "calm",
  adultHelp: "none",
  participant_mode: "single",
  participant_min: 1,
  participant_max: 1,
  ageFit: { minAge: 5, maxAge: 8, targetAges: [6, 7], maturityLevel: "child" },
  roleGuide: { name: "Clerk", description: "Sort letters.", childRoles: [] },
  stepDetails: [
    { title: "Stamp", instruction: "Draw a stamp on paper.", doneWhen: "Stamp drawn." },
  ],
};

const seedB = {
  ...seedA,
  title: "Sibling Rescue HQ",
  participant_mode: "group",
  participant_min: 2,
  participant_max: 4,
  roleGuide: {
    name: "HQ",
    description: "Two roles",
    childRoles: [
      { childName: "Player 1", age: 6, roleTitle: "Scout", responsibility: "Look", firstAction: "Go" },
      { childName: "Player 2", age: 10, roleTitle: "Lead", responsibility: "Plan", firstAction: "Map" },
    ],
  },
};

const seedC = {
  ...seedA,
  title: "Loud Parade",
  energy: "high",
  summary: "A loud stomping parade",
};

const seedD = {
  ...seedA,
  title: "Teen Studio",
  ageFit: { minAge: 12, maxAge: 15, targetAges: [13], maturityLevel: "teen" },
};

describe("recommendation integrity suite", () => {
  it("cache-only request for age 6 imaginative quiet returns only seed A", () => {
    const request = requestForAges([6]);
    const eligible = [seedA, seedB, seedC, seedD].filter(
      (activity) => evaluateActivityFit(activity, request).eligible
    );
    expect(eligible.map((a) => a.title)).toEqual(["Animal Post Office"]);
  });

  it("rejects water and screen activities under safety settings", () => {
    const request = requestForAges([6]);
    expect(
      evaluateActivityFit(
        { ...seedA, title: "Sink Splash", summary: "Splash water in the sink" },
        request
      ).hardFailures
    ).toContain("no-water");
    expect(
      evaluateActivityFit(
        { ...seedA, title: "Tablet Quest", summary: "Watch a youtube video on a tablet" },
        request
      ).hardFailures
    ).toContain("screen-free");
  });

  it("rejects adult-required activities when independent", () => {
    const request = requestForAges([6]);
    expect(
      evaluateActivityFit(
        { ...seedA, adultHelp: "required", title: "Ask Grown-Up Lab" },
        request
      ).hardFailures
    ).toContain("supervision-mismatch");
  });

  it("family mode allows two-role activities", () => {
    const request = requestForAges([6, 13], {
      activity: { style: "imaginative", energyLevel: "quiet" },
    });
    const familySeed = {
      ...seedB,
      ageFit: {
        minAge: 6,
        maxAge: 13,
        targetAges: [6, 13],
        maturityLevel: "mixed-age",
      },
      energy: "calm",
    };
    const result = evaluateActivityFit(familySeed, request);
    expect(result.hardFailures).not.toContain("participant-count-mismatch");
  });

  it("family mode allows cooperative socialMode with stale cache metadata", () => {
    const request = requestForAges([6, 8]);
    const cooperativeSeed = {
      ...seedA,
      title: "Team Sorting Line",
      traits: { socialMode: "cooperative" },
      participant_mode: "single",
      participant_min: 1,
      participant_max: 1,
      participant_fit_validated: false,
      ageFit: {
        minAge: 5,
        maxAge: 10,
        targetAges: [6, 8],
        maturityLevel: "child",
      },
      roleGuide: {
        name: "Sorters",
        description: "Sort together.",
        childRoles: [
          { childName: "A", age: 6, roleTitle: "Sorter", responsibility: "Sort", firstAction: "Pick" },
          { childName: "B", age: 8, roleTitle: "Checker", responsibility: "Check", firstAction: "Verify" },
        ],
      },
      stepDetails: [
        { title: "Sort", actions: ["Pick five items.", "Place them in a row.", "Check the row."], doneWhen: "Row is sorted.", starterIdeas: [], ifStuck: "Sort three first.", roleInstructions: [] },
        { title: "Label", actions: ["Write a label.", "Tape it on.", "Read it aloud."], doneWhen: "Label is taped.", starterIdeas: [], ifStuck: "Use initials.", roleInstructions: [] },
      ],
    };
    const result = evaluateActivityFit(cooperativeSeed, request);
    expect(result.hardFailures).not.toContain("participant-count-mismatch");
  });

  it("builds sanitized generation context without names", () => {
    const participants = resolveParticipantContext({
      selectedChildProfiles: [
        { id: "c6", name: "SecretName", birthDate: "2020-01-01" },
      ],
    });
    const snapshot = buildSanitizedGenerationContext({
      participants,
      activityStyle: "imaginative",
      energyLevel: "quiet",
      sourcePath: "cache-first",
      requestContext: {
        moment: {
          space: "Kitchen table",
          messLevel: "low",
          noiseLevel: "quiet",
          supervisionLevel: "independent",
          timeNeededMinutes: 20,
        },
        safety: { maxActivityMinutes: 20 },
      },
    });
    expect(snapshot.participantCount).toBe(1);
    expect(snapshot.participantMode).toBe("single-child");
    expect(JSON.stringify(snapshot)).not.toMatch(/SecretName/);
    expect(snapshot.fitPolicyVersion).toBe(1);
  });
});
