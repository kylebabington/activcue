import { describe, expect, it } from "vitest";
import {
  evaluateActivityAgeQuality,
  filterActivitiesByAgeFit,
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
        ageFit: { minAge: 8, maxAge: 12 },
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

  it("filters a batch and keeps eligible activities", () => {
    const { activities, rejectedCount } = filterActivitiesByAgeFit(
      [
        {
          title: "Good",
          ageFit: { minAge: 5, maxAge: 16 },
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
          ageFit: { minAge: 3, maxAge: 5 },
          roleGuide: { childRoles: [] },
        },
      ],
      mixedChildren
    );

    expect(rejectedCount).toBe(1);
    expect(activities.map((item) => item.title)).toEqual(["Good"]);
  });
});
