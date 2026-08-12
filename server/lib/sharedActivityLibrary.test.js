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

  it("penalizes times_shown up to 4 and does not hard-ban", () => {
    expect(impressionRankingPenalty({ times_shown: 1 }, now)).toBe(1);
    expect(impressionRankingPenalty({ times_shown: 9 }, now)).toBe(4);
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
    expect(penalty).toBe(1 + 12);
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
        ageFit: { minAge: 8, maxAge: 12, targetAges: [10] },
      },
    };
    expect(candidatePassesAgeRange(row, [10])).toBe(true);
    expect(candidatePassesAgeRange(row, [13])).toBe(false);
    expect(candidatePassesAgeRange(row, [8, 13])).toBe(false);
  });
});
