// server/lib/recommendationIds.js

import { randomUUID } from "crypto";

export function createRecommendationBatchId() {
  return randomUUID();
}

export function createCandidateId() {
  return randomUUID();
}

export function attachRecommendationIds(activities = [], batchId = createRecommendationBatchId()) {
  const list = Array.isArray(activities) ? activities : [];

  return {
    recommendationBatchId: batchId,
    activities: list.map((activity) => ({
      ...activity,
      recommendationBatchId: batchId,
      candidateId: activity.candidateId || createCandidateId(),
    })),
  };
}
