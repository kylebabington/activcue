import { describe, expect, it } from "vitest";
import {
  SUGGESTION_COUNT,
  computeAiGenerateCount,
  computeV4ImaginativeGenerateCount,
  clampAiGenerateCount,
  isImpressionSuppressed,
  selectFreshFirstCandidates,
  takeAiFill,
} from "./suggestionFill.js";

describe("computeV4ImaginativeGenerateCount", () => {
  it("requests exactly the missing display slots for V4 imaginative", () => {
    expect(computeV4ImaginativeGenerateCount(1)).toBe(1);
    expect(computeV4ImaginativeGenerateCount(2)).toBe(2);
    expect(computeV4ImaginativeGenerateCount(3)).toBe(3);
    expect(computeV4ImaginativeGenerateCount(9)).toBe(5);
  });
});

describe("computeAiGenerateCount", () => {
  it("maps slots to over-generate counts capped at 5", () => {
    expect(computeAiGenerateCount(1)).toBe(3);
    expect(computeAiGenerateCount(2)).toBe(4);
    expect(computeAiGenerateCount(3)).toBe(5);
    expect(computeAiGenerateCount(9)).toBe(5);
  });
});

describe("clampAiGenerateCount", () => {
  it("allows counts above SUGGESTION_COUNT up to MAX", () => {
    expect(clampAiGenerateCount(1)).toBe(1);
    expect(clampAiGenerateCount(4)).toBe(4);
    expect(clampAiGenerateCount(5)).toBe(5);
    expect(clampAiGenerateCount(9)).toBe(5);
    expect(clampAiGenerateCount(undefined)).toBe(SUGGESTION_COUNT);
  });
});

describe("takeAiFill", () => {
  it("fills remaining slots from refill survivors", () => {
    const first = [{ title: "A" }, { title: "B" }];
    const refill = [{ title: "C" }, { title: "D" }];
    expect(takeAiFill(first, refill, 3).map((a) => a.title)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("returns underfilled when refill cannot complete the board", () => {
    expect(takeAiFill([{ title: "A" }], [], 3)).toHaveLength(1);
    expect(takeAiFill([], [], 3)).toHaveLength(0);
  });

  it("covers plan fill scenarios by length", () => {
    // cache=2 → aiSlots=1; first 0 pass, refill 1 → 1 AI
    expect(takeAiFill([], [{ title: "R1" }], 1)).toHaveLength(1);
    // cache=1 → aiSlots=2; first 1, refill 1 → 2
    expect(
      takeAiFill([{ title: "A" }], [{ title: "R1" }], 2)
    ).toHaveLength(2);
    // cache=0 → aiSlots=3; first 3 → 3
    expect(
      takeAiFill([{ title: "A" }, { title: "B" }, { title: "C" }], [], 3)
    ).toHaveLength(3);
    // cache=0; first 2, refill 1 → 3
    expect(
      takeAiFill(
        [{ title: "A" }, { title: "B" }],
        [{ title: "R1" }],
        3
      )
    ).toHaveLength(3);
    // all fail → underfilled
    expect(takeAiFill([], [], 3).length < SUGGESTION_COUNT).toBe(true);
  });
});

describe("isImpressionSuppressed", () => {
  const now = Date.parse("2026-08-26T12:00:00.000Z");

  it("suppresses heavily shown or recently seen impressions", () => {
    expect(isImpressionSuppressed({ times_shown: 3 }, now)).toBe(true);
    expect(
      isImpressionSuppressed(
        { times_shown: 1, last_seen_at: "2026-08-25T12:00:00.000Z" },
        now
      )
    ).toBe(true);
    expect(
      isImpressionSuppressed(
        { times_shown: 1, last_seen_at: "2026-07-01T12:00:00.000Z" },
        now
      )
    ).toBe(false);
    expect(isImpressionSuppressed(null, now)).toBe(false);
  });
});

describe("selectFreshFirstCandidates", () => {
  const now = Date.parse("2026-08-26T12:00:00.000Z");

  it("prefers fresh over heavily shown when both fit", () => {
    const selected = selectFreshFirstCandidates(
      [
        {
          row: { id: "heavy" },
          score: 100,
          impression: { times_shown: 14 },
          suppressed: true,
        },
        {
          row: { id: "fresh" },
          score: 10,
          impression: null,
          suppressed: false,
        },
      ],
      1,
      now
    );
    expect(selected.map((e) => e.row.id)).toEqual(["fresh"]);
  });

  it("backfills from suppressed when fresh pool is empty", () => {
    const selected = selectFreshFirstCandidates(
      [
        {
          row: { id: "a" },
          score: 50,
          impression: { times_shown: 9, last_seen_at: "2026-08-20T12:00:00.000Z" },
          suppressed: true,
        },
        {
          row: { id: "b" },
          score: 40,
          impression: {
            times_shown: 3,
            last_seen_at: "2026-08-01T12:00:00.000Z",
          },
          suppressed: true,
        },
      ],
      2,
      now
    );
    expect(selected.map((e) => e.row.id)).toEqual(["b", "a"]);
  });
});
