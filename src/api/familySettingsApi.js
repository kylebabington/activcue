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

export async function saveParentPin(
    pin,
    { expectedUserId } = {}
) {
    const response = await authenticatedRequest(
        "/api/family-settings/parent-pin",
        {
            method: "POST",
            body: JSON.stringify({ pin }),
            expectedUserId,
        }
    );

    return response.json();
}

export async function verifyParentPin(
    pin,
    { expectedUserId } = {}
) {
    const response = await authenticatedRequest(
        "/api/family-settings/verify-parent-pin",
        {
            method: "POST",
            body: JSON.stringify({ pin }),
            expectedUserId,
        }
    );

    return response.json();
}
