// src/api/recommendationTelemetryApi.js

import { authenticatedRequest } from "./apiClient";

export async function createActivityMoment(payload, options = {}) {
  const response = await authenticatedRequest("/api/activity-moments", {
    method: "POST",
    body: JSON.stringify(payload),
    ...options,
  });
  return response.json();
}

export async function createRecommendationBatch(payload, options = {}) {
  const response = await authenticatedRequest("/api/recommendation-batches", {
    method: "POST",
    body: JSON.stringify(payload),
    ...options,
  });
  return response.json();
}
