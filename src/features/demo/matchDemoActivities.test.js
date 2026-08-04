import { describe, expect, it } from "vitest";
import {
  matchDemoActivities,
  rotateDemoResults,
} from "./matchDemoActivities";

describe("matchDemoActivities", () => {
  it("returns three dinner matches for Maya without network", () => {
    const result = matchDemoActivities({
      momentId: "dinner",
      childId: "maya",
    });

    expect(result.results).toHaveLength(3);
    expect(result.totalMatches).toBeGreaterThanOrEqual(3);
    expect(result.results[0].activity.title).toBeTruthy();
    expect(result.results[0].whyFitChips.length).toBeGreaterThan(0);
  });

  it("changes suggestions when child age changes", () => {
    const forMaya = matchDemoActivities({
      momentId: "dinner",
      childId: "maya",
    });
    const forJack = matchDemoActivities({
      momentId: "dinner",
      childId: "jack",
    });

    const mayaTitles = forMaya.results.map((r) => r.activity.title);
    const jackTitles = forJack.results.map((r) => r.activity.title);

    // Age gate should produce a different set for 8 vs 13 in most cases.
    expect(mayaTitles.join("|")).not.toEqual(jackTitles.join("|"));
  });

  it("rotates to a Plan B batch", () => {
    const first = matchDemoActivities({ momentId: "workCall", childId: "maya" });
    const second = rotateDemoResults(first);
    expect(second.results).toHaveLength(3);
    expect(second.offset).toBe(3);
    const firstTitles = first.results.map((r) => r.activity.title);
    const secondTitles = second.results.map((r) => r.activity.title);
    expect(secondTitles.some((title) => !firstTitles.includes(title))).toBe(
      true
    );
  });
});
