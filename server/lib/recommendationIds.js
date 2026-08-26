// server/lib/recommendationIds.js

import { randomUUID } from "crypto";

export function createRecommendationBatchId() {
  return randomUUID();
}

export function createCandidateId() {
  return randomUUID();
}

/**
 * Attach per-impression recommendation IDs.
 *
 * recommendation_candidates.id must be a fresh UUID every time an activity is
 * shown. sharedCandidateId (library FK) is preserved separately and must never
 * be reused as the impression primary key.
 */
export function attachRecommendationIds(
  activities = [],
  batchId = createRecommendationBatchId()
) {
  const list = Array.isArray(activities) ? activities : [];

  return {
    recommendationBatchId: batchId,
    activities: list.map((activity) => {
      const sharedCandidateId =
        activity?.sharedCandidateId ||
        activity?.shared_candidate_id ||
        null;

      return {
        ...activity,
        recommendationBatchId: batchId,
        // Always mint a new impression id — never reuse library/shared ids.
        candidateId: createCandidateId(),
        sharedCandidateId: sharedCandidateId || null,
      };
    }),
  };
}
