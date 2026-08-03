// src/api/familyMemoryApi.js

import { authenticatedRequest } from "./apiClient";

/*
 * Cloud favorites + activity events + activity sessions
 * against /api/family-memory/*
 */

export async function listSavedActivities({ expectedUserId } = {}) {
  const response = await authenticatedRequest(
    "/api/family-memory/saved-activities",
    {
      method: "GET",
      expectedUserId,
    }
  );

  return response.json();
}

export async function saveSavedActivity(activityData, { expectedUserId } = {}) {
  const response = await authenticatedRequest(
    "/api/family-memory/saved-activities",
    {
      method: "POST",
      body: JSON.stringify({ activityData }),
      expectedUserId,
    }
  );

  return response.json();
}

export async function deleteSavedActivity(id, { expectedUserId } = {}) {
  const response = await authenticatedRequest(
    `/api/family-memory/saved-activities/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      expectedUserId,
    }
  );

  return response.json();
}

export async function listActivityEvents(
  { childId, limit } = {},
  { expectedUserId } = {}
) {
  const params = new URLSearchParams();

  if (typeof childId === "string" && childId) {
    params.set("childId", childId);
  }

  if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
    params.set("limit", String(Number(limit)));
  }

  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await authenticatedRequest(
    `/api/family-memory/activity-events${query}`,
    {
      method: "GET",
      expectedUserId,
    }
  );

  return response.json();
}

export async function appendActivityEvent(event, { expectedUserId } = {}) {
  const response = await authenticatedRequest(
    "/api/family-memory/activity-events",
    {
      method: "POST",
      body: JSON.stringify(event),
      expectedUserId,
    }
  );

  return response.json();
}

export async function clearActivityEvents({ expectedUserId } = {}) {
  const response = await authenticatedRequest(
    "/api/family-memory/activity-events",
    {
      method: "DELETE",
      expectedUserId,
    }
  );

  return response.json();
}

export async function resetFamilyData({ expectedUserId } = {}) {
  const response = await authenticatedRequest("/api/family-data", {
    method: "DELETE",
    expectedUserId,
  });

  return response.json();
}

export async function createActivitySession(session, { expectedUserId } = {}) {
  const response = await authenticatedRequest(
    "/api/family-memory/activity-sessions",
    {
      method: "POST",
      body: JSON.stringify(session),
      expectedUserId,
    }
  );

  return response.json();
}

export async function updateActivitySession(
  id,
  patch,
  { expectedUserId } = {}
) {
  const response = await authenticatedRequest(
    `/api/family-memory/activity-sessions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
      expectedUserId,
    }
  );

  return response.json();
}

export async function listActivitySessions(
  { childId, limit } = {},
  { expectedUserId } = {}
) {
  const params = new URLSearchParams();

  if (typeof childId === "string" && childId) {
    params.set("childId", childId);
  }

  if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
    params.set("limit", String(Number(limit)));
  }

  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await authenticatedRequest(
    `/api/family-memory/activity-sessions${query}`,
    {
      method: "GET",
      expectedUserId,
    }
  );

  return response.json();
}
