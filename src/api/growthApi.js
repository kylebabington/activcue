// src/api/growthApi.js

import { authenticatedRequest } from "./apiClient";

export async function getGrowthMetrics({ range = "7d" } = {}) {
  const params = new URLSearchParams({ range });
  const response = await authenticatedRequest(
    `/api/admin/growth?${params.toString()}`,
    { method: "GET" }
  );
  return response.json();
}
