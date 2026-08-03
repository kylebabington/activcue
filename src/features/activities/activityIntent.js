// src/features/activities/activityIntent.js
// Client sends structured generation intent only — no AI policy prose.

export function buildKidBoredIntent({ kidActivityStyle, kidEnergyLevel }) {
  return {
    activityStyle: kidActivityStyle === "imaginative" ? "imaginative" : "simple",
    energyLevel: kidEnergyLevel || "neutral",
    generationMode: "kid-bored",
  };
}

export function buildAutoStartIntent({ kidActivityStyle, kidEnergyLevel }) {
  return {
    activityStyle: kidActivityStyle === "imaginative" ? "imaginative" : "simple",
    energyLevel: kidEnergyLevel || "neutral",
    generationMode: "auto-start",
  };
}

export function buildFeedbackIntent({
  feedbackIntent,
  previousActivityTitle = "",
  activityStyle = "simple",
  energyLevel = "neutral",
}) {
  return {
    activityStyle:
      activityStyle === "imaginative" ? "imaginative" : "simple",
    energyLevel: energyLevel || "neutral",
    generationMode: "feedback",
    feedbackIntent: feedbackIntent || "more-like-this",
    previousActivityTitle: previousActivityTitle || "",
  };
}

/*
 * Legacy string feedback still accepted by the API for one release.
 * Prefer generationIntent going forward.
 */
export function intentToLegacyFeedbackContext(intent) {
  if (!intent || typeof intent !== "object") {
    return "";
  }

  const parts = [
    `generationMode=${intent.generationMode || "generate"}`,
    `activityStyle=${intent.activityStyle || "simple"}`,
    `energyLevel=${intent.energyLevel || "neutral"}`,
  ];

  if (intent.feedbackIntent) {
    parts.push(`feedbackIntent=${intent.feedbackIntent}`);
  }

  if (intent.previousActivityTitle) {
    parts.push(`previousActivityTitle=${intent.previousActivityTitle}`);
  }

  if (intent.inventoryHint) {
    parts.push(intent.inventoryHint);
  }

  return parts.join("\n");
}
