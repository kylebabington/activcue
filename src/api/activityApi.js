// src/api/activityApi.js

const API_BASE_URL = "http://localhost:3001";

export async function getActivitySuggestions(activityRequest) {
    const response = await fetch(`${API_BASE_URL}/api/activity-suggestions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(activityRequest),
    });

    if (!response.ok) {
        throw new Error("Failed to generate activity suggestions.");
    }

    const data = await response.json();

    return data.activities;
}