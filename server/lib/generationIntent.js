// server/lib/generationIntent.js
// Expand structured client intent into server-owned prompt guidance.

const ENERGY_GUIDANCE = {
  quiet:
    "The child feels quiet or low-energy. Prefer calm, low-noise activities. Avoid running, shouting, wild movement, or complex setup.",
  energetic:
    "The child has extra energy. Suggest movement or active engagement only if the current family moment allows it. If the parent moment requires quiet, choose contained energy like building, sorting, or quiet movement.",
  neutral:
    "The child feels neutral. Suggest an activity with a balanced amount of effort.",
};

const FEEDBACK_GUIDANCE = {
  "more-like-this":
    "The family liked the previous activity. Suggest more with a similar feeling, but do not repeat the same title.",
  "too-messy":
    "The previous activity was too messy. Suggest lower-mess alternatives.",
  "too-hard":
    "The previous activity was too hard. Suggest easier alternatives.",
  "need-quieter":
    "The previous activity was too loud or active. Suggest quieter alternatives.",
  "need-another-idea":
    "The child wants something different now. Suggest fresh activities that feel different from the previous one.",
  "timer-more-like-this":
    "The child finished or liked the previous activity. Suggest similar options without repeating it.",
  "inventory-retry":
    "Prioritize activities that use only items from the provided inventory.",
};

export function expandGenerationIntent(intent = {}, fallbackFeedback = "") {
  if (!intent || typeof intent !== "object") {
    return fallbackFeedback || "No specific feedback yet.";
  }

  const activityStyle =
    intent.activityStyle === "imaginative" ? "imaginative" : "simple";
  const energyKey =
    intent.energyLevel === "quiet" || intent.energyLevel === "energetic"
      ? intent.energyLevel
      : "neutral";
  const generationMode = intent.generationMode || "generate";
  const feedbackIntent = intent.feedbackIntent || "";
  const previousTitle = intent.previousActivityTitle || "";

  const lines = [
    `Structured generation intent:`,
    `- generationMode: ${generationMode}`,
    `- activityStyle: ${activityStyle}`,
    `- energyLevel: ${energyKey}`,
    ENERGY_GUIDANCE[energyKey],
  ];

  if (generationMode === "kid-bored") {
    lines.push(
      "The child tapped I'm Bored. Generate 3 activities that fit BOTH the child's style/energy and the current family moment."
    );
  }

  if (generationMode === "auto-start") {
    lines.push(
      "The child wants the app to choose and start something automatically. Prioritize easy-to-start options that require the least decision-making."
    );
  }

  if (feedbackIntent && FEEDBACK_GUIDANCE[feedbackIntent]) {
    lines.push(FEEDBACK_GUIDANCE[feedbackIntent]);
  }

  if (previousTitle) {
    lines.push(`Previous activity title: "${previousTitle}".`);
  }

  if (intent.inventoryHint) {
    lines.push(String(intent.inventoryHint));
  }

  if (fallbackFeedback && typeof fallbackFeedback === "string") {
    const trimmed = fallbackFeedback.trim();
    if (trimmed && !trimmed.startsWith("generationMode=")) {
      lines.push(`Additional context:\n${trimmed}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}
