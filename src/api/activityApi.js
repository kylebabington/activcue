// src/api/activityApi.js

import { authenticatedRequest } from "./apiClient";

/*
 * Request three activity suggestions from the protected Express endpoint.
 */
export async function getActivitySuggestions(activityRequest) {
    const response = await authenticatedRequest(
        "/api/activity-suggestions",
        {
            method: "POST",
            body: JSON.stringify(activityRequest),
        }
    );

    const data = await response.json();

    return data.activities;
}

/*
 * Request a protected AI-generated hint for the active quest step.
 */
export async function getQuestStepHint(hintRequest) {
    const response = await authenticatedRequest(
        "/api/quest-step-hint",
        {
            method: "POST",
            body: JSON.stringify(hintRequest),
        }
    );

    const data = await response.json();

    return data.hint;
}