// src/api/householdsApi.js

import { authenticatedRequest } from "./apiClient";

export async function getMyHousehold() {
  const response = await authenticatedRequest("/api/households/me");
  return response.json();
}

export async function inviteHouseholdMember({ email, role = "member" }) {
  const response = await authenticatedRequest("/api/households/invites", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
  return response.json();
}

export async function acceptHouseholdInvite(token) {
  const response = await authenticatedRequest("/api/households/invites/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return response.json();
}
