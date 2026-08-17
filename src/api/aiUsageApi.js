// src/api/aiUsageApi.js

import { authenticatedRequest } from "./apiClient";

export async function getAdminAiUsage({ range = "7d" } = {}) {
  const params = new URLSearchParams({ range });
  const response = await authenticatedRequest(
    `/api/admin/ai-usage?${params.toString()}`,
    { method: "GET" }
  );
  return response.json();
}
