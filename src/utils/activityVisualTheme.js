/** Deterministic visual themes for imaginative activity cards (no AI art). */

import {
  resolveDoneWhen,
  resolveIfStuck,
  resolveSceneInstruction,
  resolveSceneTitle,
} from "./questStepCopy";

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

export const STARTER_KIND_ICONS = {
  imagination: "✨",
  choice: "🔎",
  dialogue: "💬",
  drawing: "✏️",
  building: "🧱",
};

export function getVisualThemeMeta(visualTheme) {
  const key =
    typeof visualTheme === "string" && VISUAL_THEME_META[visualTheme]
      ? visualTheme
      : "fantasy";
  return { key, ...VISUAL_THEME_META[key] };
}

export function getActivityRoleLabel(activity) {
  const name = activity?.roleGuide?.name || activity?.kidRole || "";
  return typeof name === "string" ? name.trim() : "";
}

export function getActivityMissionText(activity) {
  return activity?.mission || activity?.roleGuide?.goal || activity?.summary || "";
}

export function getStarterIdeas(activity) {
  if (Array.isArray(activity?.starterIdeas) && activity.starterIdeas.length > 0) {
    return activity.starterIdeas
      .map(normalizeStarterIdea)
      .filter(Boolean);
  }
  if (Array.isArray(activity?.starterPrompts)) {
    return activity.starterPrompts.filter(Boolean).map((prompt) => ({
      title: "",
      example: String(prompt).trim(),
      kind: "imagination",
    }));
  }
  return [];
}

/**
 * Age band for kid-facing UI copy, from activity.ageFit.
 * younger <10 | tween 10–12 | teen 13+
 */
export function getActivityCopyAgeBand(activity) {
  const maturity = activity?.ageFit?.maturityLevel;
  if (maturity === "teen") return "teen";
  if (maturity === "tween") return "tween";
  if (maturity === "young-child" || maturity === "child") return "younger";

  const maxAge = Number(activity?.ageFit?.maxAge);
  if (Number.isFinite(maxAge)) {
    if (maxAge >= 13) return "teen";
    if (maxAge >= 10) return "tween";
  }
  return "younger";
}

/** Activity-level starters: “what kind of version sounds fun?” */
export function getActivityStarterSectionLabel(activity) {
  const isImaginative = activity?.activityStyle !== "simple";
  const band = getActivityCopyAgeBand(activity);
  if (!isImaginative) {
    return band === "younger" ? "Starter Ideas" : "Pick a starting direction";
  }
  if (band === "younger") return "Pick how your story begins";
  return "Pick a starting direction";
}

/** Step-level starters: “what could I do right now?” */
export function getStepStarterSectionLabel(activity) {
  const band = getActivityCopyAgeBand(activity);
  if (band === "teen") return "Try this";
  if (band === "tween") return "A few ways in";
  return "Need an idea? Try one of these";
}

export function getStarterKindIcon(kind) {
  return STARTER_KIND_ICONS[kind] || STARTER_KIND_ICONS.imagination;
}

/** Kid-facing starter copy — one line only, never a separate title + example. */
export function getStarterIdeaText(idea) {
  if (!idea || typeof idea !== "object") return "";
  const example = String(idea.example || "").trim();
  const title = String(idea.title || "").trim();
  return example || title;
}

function normalizeStarterIdea(idea) {
  const text = getStarterIdeaText(idea);
  if (!text) return null;
  return {
    title: "",
    example: text,
    kind: idea?.kind || "imagination",
  };
}

/**
 * Prefer structured step starterIdeas; fall back to legacy examples[].
 */
export function getStepStarterIdeas(step) {
  if (!step || typeof step !== "object") return [];

  if (Array.isArray(step.starterIdeas) && step.starterIdeas.length > 0) {
    return step.starterIdeas
      .map(normalizeStarterIdea)
      .filter(Boolean)
      .slice(0, 3);
  }

  const examples = Array.isArray(step.examples) ? step.examples : [];
  return examples
    .filter((example) => typeof example === "string" && example.trim())
    .slice(0, 3)
    .map((example) => ({
      title: "",
      example: example.trim(),
      kind: "imagination",
    }));
}

/**
 * Return at most three deterministic, step-local recovery prompts.
 *
 * Stuck help is lowest-friction rescue only (stuckPrompts / ifStuck).
 * Creative possibilities live on starterIdeas, not in this pool.
 */
export function getStepStuckPrompts(step) {
  if (!step || typeof step !== "object") return [];

  const explicit = Array.isArray(step.stuckPrompts) ? step.stuckPrompts : [];
  const candidates = [...explicit, step.ifStuck];

  const seen = new Set();
  return candidates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .map((value) =>
      resolveIfStuck({
        instruction: step.instruction,
        title: step.title,
        ifStuck: value,
      })
    )
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
    return activity.stepDetails.map((step, index) => {
      const instruction = resolveSceneInstruction(step, activity, index);
      const title = resolveSceneTitle(
        { ...step, instruction },
        activity,
        index
      );
      return {
        ...step,
        title,
        instruction,
        doneWhen: resolveDoneWhen(step),
        ifStuck: resolveIfStuck(step),
      };
    });
  }
  if (Array.isArray(activity?.steps)) {
    return activity.steps.filter(Boolean).map((step, index) => {
      const raw = String(step).trim();
      const instruction = resolveSceneInstruction(
        { instruction: raw, title: raw },
        activity,
        index
      );
      const title = resolveSceneTitle(
        { instruction, title: raw },
        activity,
        index
      );
      return {
        title,
        instruction,
        starterIdeas: [],
        examples: [],
        doneWhen: resolveDoneWhen({ instruction: raw, title: raw }),
        ifStuck: resolveIfStuck({ instruction: raw, title: raw }),
        roleInstructions: [],
      };
    });
  }
  return [];
}
