import { describe, expect, it } from "vitest";
import {
  evaluateActivityAgeQuality,
  filterActivitiesByAgeFit,
  validateActivityVoiceQuality,
  validateAgeContentFit,
  validateMixedAgeRoles,
} from "./ageFitValidation.js";

const mixedChildren = [
  { name: "Avery", ageYears: 6 },
  { name: "Quinn", ageYears: 10 },
  { name: "Reese", ageYears: 14 },
];

describe("ageFitValidation", () => {
  it("rejects activities outside ageFit range", () => {
    const evaluation = evaluateActivityAgeQuality(
      {
        ageFit: { minAge: 8, maxAge: 12, maturityLevel: "tween" },
        roleGuide: { childRoles: [] },
      },
      [{ name: "Morgan", ageYears: 13 }]
    );
    expect(evaluation.ok).toBe(false);
    expect(evaluation.reasons).toContain("age-fit-range");
  });

  it("rejects mixed-age activities where oldest is only a babysitter", () => {
    const result = validateMixedAgeRoles(
      {
        roleGuide: {
          childRoles: [
            {
              childName: "Avery",
              roleTitle: "Helper",
              responsibility: "Sort pieces",
              firstAction: "Make piles",
            },
            {
              childName: "Quinn",
              roleTitle: "Builder",
              responsibility: "Assemble the base",
              firstAction: "Start the frame",
            },
            {
              childName: "Reese",
              roleTitle: "Supervisor",
              responsibility: "Supervise the younger kids and manage them",
              firstAction: "Watch the younger children",
            },
          ],
        },
      },
      mixedChildren
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("oldest-as-babysitter");
  });

  it("rejects blanket fort content for a 14-year-old even if ageFit spans them", () => {
    const result = validateAgeContentFit(
      {
        title: "Blanket Fort Adventure",
        summary: "Build a magical blanket castle!",
        ageFit: {
          minAge: 5,
          maxAge: 16,
          maturityLevel: "mixed-age",
          ageFitReason: "Fun for all ages",
        },
      },
      [{ name: "Jordan", ageYears: 14 }]
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("young-child-content-for-older");
  });

  it("rejects blanket cave content for a 13-year-old", () => {
    const result = validateAgeContentFit(
      {
        title: "Blanket Cave Explorer",
        summary: "Crawl into a cozy blanket cave and find soft treasures.",
        ageFit: {
          minAge: 5,
          maxAge: 16,
          maturityLevel: "teen",
          ageFitReason: "Covers the age range",
        },
      },
      [{ name: "Jordan", ageYears: 13 }]
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("young-child-content-for-older");
  });

  it("rejects cozy fort content for a 13-year-old", () => {
    const result = validateAgeContentFit(
      {
        title: "Build a cozy fort",
        summary: "Gather blankets and pillows and make a cozy fort to crawl into.",
        ageFit: {
          minAge: 5,
          maxAge: 16,
          maturityLevel: "teen",
          ageFitReason: "Building challenge",
        },
      },
      [{ name: "Jordan", ageYears: 13 }]
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("young-child-content-for-older");
  });

  it("rejects child maturityLevel for teens", () => {
    const result = validateAgeContentFit(
      {
        title: "Strategy Board Night",
        ageFit: { minAge: 12, maxAge: 16, maturityLevel: "child" },
      },
      [{ name: "Jordan", ageYears: 14 }]
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("maturity-too-young");
  });

  it("allows age-framed lounge design for teens", () => {
    const result = validateAgeContentFit(
      {
        title: "Design a compact movie lounge",
        summary: "Use blankets as soft walls for an interior design lounge.",
        ageFit: {
          minAge: 13,
          maxAge: 16,
          maturityLevel: "teen",
          ageFitReason: "Design challenge with a tangible result",
        },
      },
      [{ name: "Jordan", ageYears: 14 }]
    );
    expect(result.ok).toBe(true);
  });

  it("rejects pretend story framing for teens", () => {
    const result = validateAgeContentFit(
      {
        title: "Hero Quest Adventure",
        mission: "You are a brave hero on a magical quest to save the kingdom.",
        ageFit: {
          minAge: 12,
          maxAge: 16,
          maturityLevel: "teen",
        },
      },
      [{ name: "Jordan", ageYears: 13 }]
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("teen-pretend-story");
  });

  it("filters a batch and keeps eligible activities", () => {
    const { activities, rejectedCount } = filterActivitiesByAgeFit(
      [
        {
          title: "Good",
          ageFit: { minAge: 5, maxAge: 16, maturityLevel: "mixed-age" },
          roleGuide: {
            childRoles: [
              {
                childName: "Avery",
                roleTitle: "Scout",
                responsibility: "Find materials",
                firstAction: "Look around",
              },
              {
                childName: "Quinn",
                roleTitle: "Builder",
                responsibility: "Assemble",
                firstAction: "Start base",
              },
              {
                childName: "Reese",
                roleTitle: "Designer",
                responsibility: "Plan the layout",
                firstAction: "Sketch the plan",
              },
            ],
          },
        },
        {
          title: "Bad",
          ageFit: { minAge: 3, maxAge: 5, maturityLevel: "young-child" },
          roleGuide: { childRoles: [] },
        },
        {
          title: "Blanket Fort Adventure",
          summary: "Build a magical blanket castle!",
          ageFit: { minAge: 5, maxAge: 16, maturityLevel: "mixed-age" },
          roleGuide: {
            childRoles: [
              {
                childName: "Avery",
                roleTitle: "Scout",
                responsibility: "Find materials",
                firstAction: "Look around",
              },
              {
                childName: "Quinn",
                roleTitle: "Builder",
                responsibility: "Assemble",
                firstAction: "Start base",
              },
              {
                childName: "Reese",
                roleTitle: "Designer",
                responsibility: "Plan the layout",
                firstAction: "Sketch the plan",
              },
            ],
          },
        },
      ],
      mixedChildren
    );

    expect(rejectedCount).toBe(2);
    expect(activities.map((item) => item.title)).toEqual(["Good"]);
  });

  it("rejects robotic worksheet phrases in kid-facing copy", () => {
    const result = validateActivityVoiceQuality({
      activityStyle: "imaginative",
      title: "Signal Hunt",
      mission: "Your task is to find the shells.",
      roleGuide: { name: "Sea Signal Finder" },
      stepDetails: [
        {
          title: "Find a clue",
          instruction: "Look around.",
          doneWhen: "Something in the story has changed because of what you did.",
          ifStuck: "Pick any object.",
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("robotic-phrase");
  });

  it("rejects generic one-word imaginative roles", () => {
    const result = validateActivityVoiceQuality({
      activityStyle: "imaginative",
      title: "Ocean Mission",
      roleGuide: { name: "Explorer" },
      kidRole: "Explorer",
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("generic-role");
  });

  it("allows specific multi-word roles and empty roles", () => {
    expect(
      validateActivityVoiceQuality({
        activityStyle: "imaginative",
        title: "Ocean Mission",
        roleGuide: { name: "Sea Signal Finder" },
        kidRole: "Sea Signal Finder",
        stepDetails: [
          {
            title: "Find the first signal",
            instruction: "Pick a corner for Station One.",
            doneWhen: "Your first station has a marker.",
            ifStuck: "Can't decide? Use the nearest chair.",
          },
        ],
      }).ok
    ).toBe(true);

    expect(
      validateActivityVoiceQuality({
        activityStyle: "imaginative",
        title: "Draw freely",
        roleGuide: { name: "" },
        kidRole: "",
      }).ok
    ).toBe(true);
  });

  it("does not flag generic roles on simple activities", () => {
    const result = validateActivityVoiceQuality({
      activityStyle: "simple",
      title: "Draw a picture",
      roleGuide: { name: "Artist" },
      kidRole: "Artist",
    });
    expect(result.ok).toBe(true);
  });
});
