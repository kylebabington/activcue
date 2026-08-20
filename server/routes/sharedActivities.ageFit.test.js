import { describe, expect, it, vi } from "vitest";
import {
  filterActivitiesByAgePolicy,
  evaluateActivityAgeFit,
} from "../utils/activityAgePolicy.js";

describe("Plan B / Rescue age policy gates", () => {
  it("keeps only age-6-compatible imaginative activities", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const activities = [
      {
        title: "Pillow Stations",
        activityStyle: "imaginative",
        ageFit: {
          minAge: 5,
          maxAge: 8,
          targetAges: [6],
          maturityLevel: "child",
        },
        stepDetails: [
          {
            title: "Set up",
            instruction: "Put three pillows on the floor. Call them Station 1, 2, and 3.",
          },
        ],
      },
      {
        title: "Teen Strategy Desk",
        activityStyle: "imaginative",
        ageFit: {
          minAge: 12,
          maxAge: 16,
          targetAges: [13],
          maturityLevel: "teen",
        },
        stepDetails: [
          {
            title: "Plan",
            instruction: "Write three constraints and pick the best route.",
          },
        ],
      },
      {
        title: "Child framed for teen",
        activityStyle: "imaginative",
        ageFit: {
          minAge: 5,
          maxAge: 14,
          targetAges: [13],
          maturityLevel: "child",
        },
        summary: "Host a stuffed animal tea party.",
      },
    ];

    const age6 = filterActivitiesByAgePolicy(activities, [{ ageYears: 6 }], {
      activityMode: "single-child",
      expectedStyle: "imaginative",
    });
    expect(age6.activities.map((a) => a.title)).toContain("Pillow Stations");
    expect(age6.activities.map((a) => a.title)).not.toContain(
      "Teen Strategy Desk"
    );

    const age13 = filterActivitiesByAgePolicy(
      activities,
      [{ ageYears: 13 }],
      { activityMode: "single-child", expectedStyle: "imaginative" }
    );
    expect(age13.activities.every((a) => a.title !== "Pillow Stations")).toBe(
      true
    );
    expect(
      age13.activities.every((a) => a.title !== "Child framed for teen")
    ).toBe(true);
  });

  it("rejects preschool framing for a 13-year-old Plan B candidate", () => {
    const result = evaluateActivityAgeFit({
      activity: {
        title: "Fairy Fort",
        summary: "Build a cozy fort for stuffed animals and fairy tea.",
        activityStyle: "imaginative",
        ageFit: {
          minAge: 5,
          maxAge: 15,
          targetAges: [13],
          maturityLevel: "teen",
        },
      },
      childrenContext: [{ ageYears: 13 }],
      activityMode: "single-child",
    });
    expect(result.eligible).toBe(false);
  });
});
