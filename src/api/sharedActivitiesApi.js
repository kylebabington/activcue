// src/api/sharedActivitiesApi.js

import { authenticatedRequest } from "./apiClient";

export async function fetchPlanBActivities(payload, options = {}) {
  const response = await authenticatedRequest("/api/shared-activities/plan-b", {
    method: "POST",
    body: JSON.stringify(payload),
    ...options,
  });
  return response.json();
}

export async function fetchRescueActivities(payload, options = {}) {
  const response = await authenticatedRequest("/api/shared-activities/rescue", {
    method: "POST",
    body: JSON.stringify(payload),
    ...options,
  });
  return response.json();
}

export async function recordSharedActivityOutcome(payload, options = {}) {
  const response = await authenticatedRequest("/api/shared-activities/outcome", {
    method: "POST",
    body: JSON.stringify(payload),
    ...options,
  });
  return response.json();
}
