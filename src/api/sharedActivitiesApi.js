// src/api/sharedActivitiesApi.js

import { authenticatedRequest } from "./apiClient";

export function fetchPlanBActivities(payload, options = {}) {
  return authenticatedRequest("/api/shared-activities/plan-b", {
    method: "POST",
    body: JSON.stringify(payload),
    ...options,
  });
}

export function fetchRescueActivities(payload, options = {}) {
  return authenticatedRequest("/api/shared-activities/rescue", {
    method: "POST",
    body: JSON.stringify(payload),
    ...options,
  });
}

export function recordSharedActivityOutcome(payload, options = {}) {
  return authenticatedRequest("/api/shared-activities/outcome", {
    method: "POST",
    body: JSON.stringify(payload),
    ...options,
  });
}
