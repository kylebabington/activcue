// src/api/authApi.js

import { authenticatedRequest } from "./apiClient";

export async function getCurrentAuthenticatedUser() {
    const response = await authenticatedRequest("/api/auth/me", {
        method: "GET",
    });

    return response.json();
}