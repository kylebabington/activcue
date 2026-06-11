// src/api/activityApi.js

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

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

export async function getQuestStepHint(hintRequest) {
    // Send the current quest step context to the backend.
    // The backend will ask AI for one small, kid-friendly hint.
    const response = await fetch(`${API_BASE_URL}/api/quest-step-hint`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(hintRequest),
    });

    // If the backend fails, throw an error so App.jsx can handle it.
    if (!response.ok) {
        throw new Error("Failed to generate quest step hint.");
    }

    // Parse the JSON response from the backend.
    const data = await response.json();

    // Expected backend shape:
    // {
    //   "hint": "Try picking one object that looks mysterious."
    // }
    return data.hint;
}