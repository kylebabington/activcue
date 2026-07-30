// src/api/familySettingsApi.js

import { authenticatedRequest } from "./apiClient";

export async function getFamilySettings() {
    const response = await authenticatedRequest(
        "/api/family-settings",
        {
            method: "GET",
        }
    );

    return response.json();
}

export async function saveFamilySettings(settings) {
    const response = await authenticatedRequest(
        "/api/family-settings",
        {
            method: "PUT",
            body: JSON.stringify(settings),
        }
    );

    return response.json();
}
