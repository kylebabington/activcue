import { describe, expect, it } from "vitest";
import { boardCandidateIds } from "./useActivityFeedback.js";

describe("boardCandidateIds", () => {
  it("collects all board candidate IDs for Not this exclusion", () => {
    const board = [
      { activity: { title: "A", candidateId: "id-a" } },
      { activity: { title: "B", candidate_id: "id-b" } },
      { title: "C", candidateId: "id-c" },
    ];
    expect(boardCandidateIds(board)).toEqual(["id-a", "id-b", "id-c"]);
  });

  it("dedupes and ignores missing ids", () => {
    expect(
      boardCandidateIds([
        { candidateId: "x" },
        { candidateId: "x" },
        { title: "no-id" },
      ])
    ).toEqual(["x"]);
  });
});
