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
 * Load curated preset activities (and entitlement metadata).
 *
 * Optional style: "simple" | "imaginative"
 */
export async function getPresetActivities({ style } = {}) {
    const query =
        typeof style === "string" && style.trim()
            ? `?style=${encodeURIComponent(style.trim().toLowerCase())}`
            : "";

    const response = await authenticatedRequest(
        `/api/preset-activities${query}`
    );

    const data = await response.json();

    return {
        activities: Array.isArray(data.activities)
            ? data.activities
            : [],
        entitlement: data.entitlement || null,
    };
}

/*
 * Unlock a preset for the current unpaid user (one free imaginative).
 */
export async function unlockPresetActivity(activityId) {
    const response = await authenticatedRequest(
        `/api/preset-activities/${encodeURIComponent(activityId)}/unlock`,
        {
            method: "POST",
        }
    );

    return response.json();
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
