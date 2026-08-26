import { describe, expect, it } from "vitest";
import {
  candidatePassesAgeRange,
  daysSinceTimestamp,
  impressionRankingPenalty,
} from "./sharedActivityLibrary.js";

describe("daysSinceTimestamp", () => {
  it("returns Infinity for missing timestamps", () => {
    expect(daysSinceTimestamp(null)).toBe(Number.POSITIVE_INFINITY);
    expect(daysSinceTimestamp("not-a-date")).toBe(Number.POSITIVE_INFINITY);
  });

  it("computes whole days since an ISO time", () => {
    const now = Date.parse("2026-08-12T12:00:00.000Z");
    expect(daysSinceTimestamp("2026-08-10T12:00:00.000Z", now)).toBe(2);
  });
});

describe("impressionRankingPenalty", () => {
  const now = Date.parse("2026-08-12T12:00:00.000Z");

  it("grows with times_shown well past the old cap of 4", () => {
    expect(impressionRankingPenalty({ times_shown: 1 }, now)).toBeGreaterThan(
      0
    );
    const once = impressionRankingPenalty({ times_shown: 1 }, now);
    const many = impressionRankingPenalty({ times_shown: 14 }, now);
    expect(many).toBeGreaterThan(once);
    expect(many).toBeGreaterThanOrEqual(25);
  });

  it("applies shown-only recency even without a start", () => {
    const recent = impressionRankingPenalty(
      {
        times_shown: 1,
        last_seen_at: "2026-08-11T12:00:00.000Z",
      },
      now
    );
    const old = impressionRankingPenalty(
      {
        times_shown: 1,
        last_seen_at: "2026-01-01T12:00:00.000Z",
      },
      now
    );
    expect(recent).toBeGreaterThan(old);
  });

  it("applies a large temporary penalty for a recent start", () => {
    const penalty = impressionRankingPenalty(
      {
        times_shown: 1,
        times_started: 1,
        last_seen_at: "2026-08-11T12:00:00.000Z",
      },
      now
    );
    // times_shown*2 + shown recency (+15) + started recency (+12)
    expect(penalty).toBe(2 + 15 + 12);
  });

  it("decays started/completed engagement over months", () => {
    const recent = impressionRankingPenalty(
      {
        times_started: 1,
        last_seen_at: "2026-08-01T12:00:00.000Z",
      },
      now
    );
    const old = impressionRankingPenalty(
      {
        times_started: 1,
        last_seen_at: "2026-02-01T12:00:00.000Z",
      },
      now
    );
    expect(recent).toBeGreaterThan(old);
    expect(old).toBe(1);
  });
});

describe("candidatePassesAgeRange", () => {
  it("allows any candidate when no child ages are provided", () => {
    expect(
      candidatePassesAgeRange({ activity_data: {} }, [])
    ).toBe(true);
  });

  it("rejects candidates without structured ageFit when ages are known", () => {
    expect(
      candidatePassesAgeRange({ activity_data: { title: "Blocks" } }, [10])
    ).toBe(false);
  });

  it("requires every child age to fall inside minAge/maxAge", () => {
    const row = {
      activity_data: {
        title: "Tween Build",
        ageFit: {
          minAge: 8,
          maxAge: 12,
          targetAges: [10],
          maturityLevel: "tween",
        },
        stepDetails: [
          { title: "Build", instruction: "Stack ten bricks into a wall." },
        ],
      },
      age_min: 8,
      age_max: 12,
      maturity_level: "tween",
      age_fit_validated: true,
    };
    expect(candidatePassesAgeRange(row, [10])).toBe(true);
    expect(candidatePassesAgeRange(row, [13])).toBe(false);
    expect(candidatePassesAgeRange(row, [8, 13])).toBe(false);
  });

  it("rejects mixed-age maturity for a single child", () => {
    const row = {
      activity_data: {
        title: "Family Hub",
        ageFit: {
          minAge: 5,
          maxAge: 13,
          targetAges: [6, 13],
          maturityLevel: "mixed-age",
        },
      },
      age_min: 5,
      age_max: 13,
      maturity_level: "mixed-age",
      age_fit_validated: true,
    };
    expect(candidatePassesAgeRange(row, [6], { activityMode: "single-child" })).toBe(
      false
    );
  });

  it("rejects unvalidated metadata when required", () => {
    const row = {
      activity_data: {
        title: "Legacy",
        ageFit: {
          minAge: 5,
          maxAge: 9,
          targetAges: [6],
          maturityLevel: "child",
        },
      },
      age_min: 5,
      age_max: 9,
      maturity_level: "child",
      age_fit_validated: false,
    };
    expect(
      candidatePassesAgeRange(row, [6], { requireValidated: true })
    ).toBe(false);
  });
});

describe("scoreActivityAgeMatch via policy", () => {
  it("exact target age beats broad match", async () => {
    const { scoreActivityAgeMatch } = await import(
      "../utils/activityAgePolicy.js"
    );
    const tight = scoreActivityAgeMatch(
      {
        ageFit: { minAge: 6, maxAge: 8, targetAges: [6, 7] },
      },
      [6]
    );
    const broad = scoreActivityAgeMatch(
      {
        ageFit: { minAge: 5, maxAge: 13, targetAges: [8, 10] },
      },
      [6]
    );
    expect(tight).toBeGreaterThan(broad);
  });
});
