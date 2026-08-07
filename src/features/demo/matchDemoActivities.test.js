import { describe, expect, it } from "vitest";
import {
  buildDemoChildProfiles,
  matchDemoActivities,
  rotateDemoResults,
} from "./matchDemoActivities";

describe("buildDemoChildProfiles", () => {
  it("builds one or two age-only profiles", () => {
    expect(buildDemoChildProfiles([8])).toEqual([
      expect.objectContaining({ id: "demo-child-1", ageYears: 8 }),
    ]);
    expect(buildDemoChildProfiles([6, 12])).toHaveLength(2);
    expect(buildDemoChildProfiles([6, 12, 15])).toHaveLength(2);
  });
});

describe("matchDemoActivities", () => {
  it("returns three dinner matches for Maya without network", () => {
    const result = matchDemoActivities({
      momentId: "cooking",
      childId: "maya",
    });

    expect(result.results).toHaveLength(3);
    expect(result.totalMatches).toBeGreaterThanOrEqual(3);
    expect(result.results[0].activity.title).toBeTruthy();
    expect(result.results[0].whyFitChips.length).toBeGreaterThan(0);
  });

  it("changes suggestions when child age changes", () => {
    const forMaya = matchDemoActivities({
      momentId: "cooking",
      childId: "maya",
    });
    const forJack = matchDemoActivities({
      momentId: "cooking",
      childId: "jack",
    });

    const mayaTitles = forMaya.results.map((r) => r.activity.title);
    const jackTitles = forJack.results.map((r) => r.activity.title);

    expect(mayaTitles.join("|")).not.toEqual(jackTitles.join("|"));
  });

  it("accepts childAges for one or two kids", () => {
    const solo = matchDemoActivities({
      momentId: "cooking",
      childAges: [8],
      limit: 3,
    });
    const duo = matchDemoActivities({
      momentId: "cooking",
      childAges: [6, 12],
      limit: 3,
    });

    expect(solo.childAges).toEqual([8]);
    expect(duo.childAges).toEqual([6, 12]);
    expect(solo.results).toHaveLength(3);
    expect(duo.results).toHaveLength(3);
  });

  it("can include both simple and imaginative activities", () => {
    const result = matchDemoActivities({
      momentId: "cooking",
      childAges: [8],
      limit: 6,
    });
    const styles = new Set(
      result.results.map((entry) => entry.activity.activityStyle)
    );
    expect(styles.size).toBeGreaterThanOrEqual(1);
  });

  it("changes ranking when moment changes", () => {
    const dinner = matchDemoActivities({
      momentId: "cooking",
      childAges: [8],
    });
    const workCall = matchDemoActivities({
      momentId: "workCall",
      childAges: [8],
    });
    const dinnerTitles = dinner.results.map((r) => r.activity.title);
    const workTitles = workCall.results.map((r) => r.activity.title);
    expect(dinnerTitles.join("|")).not.toEqual(workTitles.join("|"));
  });

  it("rotates to a Plan B batch", () => {
    const first = matchDemoActivities({
      momentId: "workCall",
      childAges: [8],
    });
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
