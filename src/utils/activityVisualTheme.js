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
  if (Number(activity?.activityFormatVersion) >= 3) {
    return activity?.story || activity?.summary || "";
  }
  return activity?.mission || activity?.roleGuide?.goal || activity?.summary || "";
}

export function isActivityFormatV3(activity) {
  const version = Number(activity?.activityFormatVersion);
  return version === 3 || version >= 4;
}

export function isActivityFormatV4(activity) {
  return Number(activity?.activityFormatVersion) === 4;
}

export function getStepSceneSetup(step) {
  if (!step || typeof step !== "object") return "";
  return String(step.sceneSetup || step.storyBeat || "").trim();
}

export function getStepSceneOutcome(step) {
  if (!step || typeof step !== "object") return "";
  return String(step.sceneOutcome || "").trim();
}

export function getActivityStoryText(activity) {
  if (isActivityFormatV3(activity)) {
    return String(activity?.story || activity?.theme || activity?.summary || "").trim();
  }
  return String(activity?.mission || activity?.theme || activity?.summary || "").trim();
}

export function getSetupGuide(activity) {
  if (!isActivityFormatV3(activity)) return null;
  const guide = activity?.setupGuide;
  if (!guide || typeof guide !== "object") return null;
  return {
    needed: Array.isArray(guide.needed) ? guide.needed.filter(Boolean) : [],
    steps: Array.isArray(guide.steps) ? guide.steps.filter(Boolean) : [],
    readyWhen: String(guide.readyWhen || "").trim(),
  };
}

export function activityNeedsSetup(activity) {
  const guide = getSetupGuide(activity);
  if (!guide) return false;
  return guide.steps.length > 0 || guide.needed.length > 0;
}

export function getFinishGuide(activity) {
  if (isActivityFormatV3(activity) && activity?.finishGuide) {
    const guide = activity.finishGuide;
    return {
      resolution: String(guide.resolution || "").trim(),
      action: String(guide.action || "").trim(),
      example: String(guide.example || "").trim(),
      doneWhen: String(guide.doneWhen || "").trim(),
      extensions: Array.isArray(guide.extensions)
        ? guide.extensions.filter(Boolean)
        : [],
    };
  }
  const extensions = Array.isArray(activity?.extensionIdeas)
    ? activity.extensionIdeas.filter(Boolean)
    : [];
  return {
    resolution: "",
    action: "",
    example: "",
    doneWhen: "",
    extensions,
  };
}

export function getStepStoryBeat(step) {
  return getStepSceneSetup(step);
}

export function getStepActions(step) {
  if (!step || typeof step !== "object") return [];
  if (Array.isArray(step.actions) && step.actions.length > 0) {
    return step.actions.map((action) => String(action || "").trim()).filter(Boolean);
  }
  const instruction = String(step.instruction || "").trim();
  return instruction ? [instruction] : [];
}

export function getStarterIdeaText(idea) {
  if (!idea || typeof idea !== "object") return "";
  const example = String(idea.example || "").trim();
  const title = String(idea.title || "").trim();
  if (example && title && example.toLowerCase() === title.toLowerCase()) {
    return example;
  }
  return example || title;
}

function normalizeStarterIdea(idea) {
  const text = getStarterIdeaText(idea);
  if (!text) return null;
  const title = String(idea?.title || "").trim();
  const example = String(idea?.example || "").trim();
  return {
    title:
      title && example && title.toLowerCase() !== example.toLowerCase()
        ? title
        : "",
    example: text,
    kind: idea?.kind || "imagination",
  };
}

export function getStarterIdeas(activity) {
  if (Array.isArray(activity?.starterIdeas) && activity.starterIdeas.length > 0) {
    return activity.starterIdeas
      .map((idea) => normalizeStarterIdea(idea))
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

/**
 * Prefer structured step starterIdeas; fall back to legacy examples[].
 */
export function getStepStarterIdeas(step) {
  if (!step || typeof step !== "object") return [];

  if (Array.isArray(step.starterIdeas) && step.starterIdeas.length > 0) {
    return step.starterIdeas
      .map((idea) => normalizeStarterIdea(idea))
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
  const isV3 = isActivityFormatV3(activity);

  if (Array.isArray(activity?.stepDetails) && activity.stepDetails.length > 0) {
    return activity.stepDetails.map((step, index) => {
      const actions = getStepActions(step);
      const instruction = isV3
        ? actions.join(" ")
        : resolveSceneInstruction(step, activity, index);
      const title = String(step.title || `Step ${index + 1}`).trim();

      return {
        ...step,
        actions,
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
