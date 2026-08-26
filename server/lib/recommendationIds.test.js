import { describe, expect, it } from "vitest";
import {
  attachRecommendationIds,
  createCandidateId,
} from "../lib/recommendationIds.js";

describe("recommendation candidate ID separation", () => {
  it("always mints a fresh impression candidateId", () => {
    const libraryId = createCandidateId();
    const first = attachRecommendationIds([
      {
        title: "Secret Agent Base",
        sharedCandidateId: libraryId,
        contentHash: "abc",
        candidateId: libraryId,
      },
    ]);
    const second = attachRecommendationIds([
      {
        title: "Secret Agent Base",
        sharedCandidateId: libraryId,
        contentHash: "abc",
        candidateId: libraryId,
      },
    ]);

    expect(first.activities[0].candidateId).not.toBe(libraryId);
    expect(second.activities[0].candidateId).not.toBe(libraryId);
    expect(first.activities[0].candidateId).not.toBe(
      second.activities[0].candidateId
    );
    expect(first.activities[0].sharedCandidateId).toBe(libraryId);
    expect(second.activities[0].sharedCandidateId).toBe(libraryId);
  });

  it("keeps sharedCandidateId null for pure AI activities", () => {
    const result = attachRecommendationIds([{ title: "Fresh Idea" }]);
    expect(result.activities[0].candidateId).toBeTruthy();
    expect(result.activities[0].sharedCandidateId).toBeNull();
  });
});
