import { describe, expect, it } from "vitest";
import { buildFamilyInsights } from "./familyInsights";
import { buildRecommendationReasons } from "./confidenceCopy";

describe("buildFamilyInsights", () => {
  it("returns empty-state guidance with no data", () => {
    const insights = buildFamilyInsights({});
    expect(insights[0].id).toBe("empty");
  });

  it("surfaces success rate and parent-activity winners", () => {
    const insights = buildFamilyInsights({
      activitySessions: [
        {
          parentActivity: "Cooking",
          independenceRating: "worked-great",
          actualMinutes: 18,
          completionStatus: "finished",
          activityEnergy: "low",
        },
        {
          parentActivity: "Cooking",
          independenceRating: "worked-great",
          actualMinutes: 22,
          completionStatus: "finished",
          activityEnergy: "low",
        },
        {
          parentActivity: "Cooking",
          independenceRating: "worked-great",
          actualMinutes: 20,
          completionStatus: "finished",
          activityEnergy: "low",
        },
        {
          parentActivity: "Work call",
          independenceRating: "didnt-last",
          actualMinutes: 4,
          completionStatus: "finished",
        },
      ],
    });

    expect(insights.some((item) => item.id === "success-rate")).toBe(true);
    expect(insights.some((item) => /Cooking works best/i.test(item.statement))).toBe(
      true
    );
    expect(insights.some((item) => item.id === "avg-minutes")).toBe(true);
  });
});

describe("buildRecommendationReasons", () => {
  it("returns up to three human reasons", () => {
    const reasons = buildRecommendationReasons(
      {
        title: "Quiet Blocks",
        energy: "low",
        mess: "low",
        uses: ["blocks"],
        verifiedUses: ["blocks"],
        estimatedMinutes: 15,
        adultHelp: "none",
      },
      [
        {
          childId: "emma",
          activityTitle: "Quiet Blocks",
          independenceRating: "worked-great",
          actualMinutes: 16,
        },
      ],
      "Emma",
      {
        childId: "emma",
        currentMoment: { parentActivity: "Cooking", space: "Kitchen" },
      }
    );

    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(3);
  });
});
