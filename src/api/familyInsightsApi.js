// src/api/familyInsightsApi.js

import { authenticatedRequest } from "./apiClient";

export function fetchFamilyInsights(options = {}) {
  return authenticatedRequest("/api/family-insights", {
    method: "GET",
    ...options,
  });
}
