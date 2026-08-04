/** Deterministic visual themes for imaginative activity cards (no AI art). */

export const VISUAL_THEME_META = {
  space: { label: "Space", icon: "🌙", accent: "#3b6ea5" },
  jungle: { label: "Nature", icon: "🌿", accent: "#2f7a4b" },
  detective: { label: "Detective", icon: "🕵️", accent: "#5a4a8a" },
  animals: { label: "Animals", icon: "🐾", accent: "#b88a3c" },
  fantasy: { label: "Fantasy", icon: "✨", accent: "#7a4fb3" },
  building: { label: "Building", icon: "🧱", accent: "#c47a2c" },
  science: { label: "Science", icon: "🔬", accent: "#2a7f8f" },
  art: { label: "Art", icon: "🎨", accent: "#c45a7a" },
  expedition: { label: "Expedition", icon: "🗺️", accent: "#6b7c3a" },
  neighborhood: { label: "Neighborhood", icon: "🏠", accent: "#4a6fa5" },
  rescue: { label: "Rescue", icon: "🛟", accent: "#c44b3c" },
  mystery: { label: "Mystery", icon: "🔮", accent: "#4a3f6b" },
};

export function getVisualThemeMeta(visualTheme) {
  const key =
    typeof visualTheme === "string" && VISUAL_THEME_META[visualTheme]
      ? visualTheme
      : "fantasy";
  return { key, ...VISUAL_THEME_META[key] };
}

export function getActivityRoleLabel(activity) {
  return (
    activity?.roleGuide?.name ||
    activity?.kidRole ||
    (activity?.activityStyle === "imaginative" ? "Adventurer" : "Player")
  );
}

export function getActivityMissionText(activity) {
  return activity?.mission || activity?.roleGuide?.goal || activity?.summary || "";
}

export function getStarterIdeas(activity) {
  if (Array.isArray(activity?.starterIdeas) && activity.starterIdeas.length > 0) {
    return activity.starterIdeas;
  }
  if (Array.isArray(activity?.starterPrompts)) {
    return activity.starterPrompts.filter(Boolean).map((prompt) => ({
      title: prompt,
      example: prompt,
      kind: "imagination",
    }));
  }
  return [];
}

/**
 * Return at most three deterministic, step-local recovery prompts.
 *
 * Newer activities may provide stuckPrompts directly. Older Activity V2 data
 * already includes ifStuck plus concrete examples, so those become the
 * fallback pool. This keeps the button useful without making another AI call.
 */
export function getStepStuckPrompts(step) {
  if (!step || typeof step !== "object") return [];

  const explicit = Array.isArray(step.stuckPrompts) ? step.stuckPrompts : [];
  const examples = Array.isArray(step.examples) ? step.examples : [];
  const candidates = [
    ...explicit,
    step.ifStuck,
    ...examples.map((example) => `Try this: ${example}`),
  ];

  const seen = new Set();
  return candidates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

export function getStepDetails(activity) {
  if (Array.isArray(activity?.stepDetails) && activity.stepDetails.length > 0) {
    return activity.stepDetails;
  }
  if (Array.isArray(activity?.steps)) {
    return activity.steps.filter(Boolean).map((step, index) => ({
      title: `Step ${index + 1}`,
      instruction: step,
      examples: [],
      doneWhen: "You finished this step.",
      ifStuck: "Do a simpler version of this step and move on.",
      roleInstructions: [],
    }));
  }
  return [];
}
