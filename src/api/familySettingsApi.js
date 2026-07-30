// src/api/familySettingsApi.js

import { authenticatedRequest } from "./apiClient";

export async function getFamilySettings(
    { expectedUserId } = {}
) {
    const response = await authenticatedRequest(
        "/api/family-settings",
        {
            method: "GET",
            expectedUserId,
        }
    );

    return response.json();
}

export async function saveFamilySettings(
    settings,
    { expectedUserId } = {}
) {
    const response = await authenticatedRequest(
        "/api/family-settings",
        {
            method: "PUT",
            body: JSON.stringify(settings),
            expectedUserId,
        }
    );

    return response.json();
}
