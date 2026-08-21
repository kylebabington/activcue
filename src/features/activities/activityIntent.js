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
 * Legacy string feedback — removed. Callers must send structured generationIntent.
 */
export function intentToLegacyFeedbackContext() {
  return "";
}
