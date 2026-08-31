import { getDevelopmentalComplexityBudget } from "./activityAgePolicy.js";
import { isActivityFormatV4 } from "./activityFormat.js";

const GENERIC_DONE_WHEN = [
  /you'?re done with the step/i,
  /finish(ed)? this (step|scene|part)/i,
  /complete(d)? the scene/i,
  /move on when you'?re ready/i,
  /you finished this/i,
  /this (step|scene|part) is (done|finished|complete)/i,
];

const PARENT_DEPENDENT = [
  /ask a grown-up/i,
  /ask an adult/i,
  /have someone hide/i,
  /have your parent/i,
  /ask someone to prepare/i,
  /have a parent/i,
  /get a grown-up/i,
];

const INVENTED_LOCATION_WORDS = [
  "station",
  "base camp",
  "checkpoint",
  "lab",
  "shop",
  "headquarters",
  "nest",
  "hospital",
  "stage",
  "goal",
  "zone",
];

const VAGUE_ACTION_PATTERNS = [
  /^explore\b/i,
  /^continue the story/i,
  /^investigate\b/i,
  /^prepare the/i,
  /^set everything up/i,
  /^make it better/i,
  /^create your signal/i,
  /^figure out what happens/i,
  /^use your imagination/i,
];

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value) {
  return asString(value).toLowerCase().replace(/\s+/g, " ");
}

function tokenize(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

/** Jaccard-style overlap on word tokens. */
export function textSimilarity(a, b) {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function collectActivityText(activity) {
  const parts = [
    activity?.story,
    activity?.summary,
    activity?.roleGuide?.description,
    activity?.roleGuide?.name,
    activity?.setupGuide?.readyWhen,
    ...(activity?.setupGuide?.steps || []),
    ...(activity?.setupGuide?.needed || []),
    activity?.finishGuide?.action,
    activity?.finishGuide?.doneWhen,
    ...(activity?.finishGuide?.extensions || []),
  ];
  for (const step of activity?.stepDetails || []) {
    parts.push(step?.title, step?.doneWhen, step?.ifStuck, ...(step?.actions || []));
    for (const idea of step?.starterIdeas || []) {
      parts.push(idea?.title, idea?.example);
    }
  }
  for (const idea of activity?.starterIdeas || []) {
    parts.push(idea?.title, idea?.example);
  }
  return parts.map(asString).filter(Boolean).join(" ").toLowerCase();
}

function validateStarterIdeas(starterIdeas, pathPrefix, errors) {
  if (!Array.isArray(starterIdeas)) return;
  starterIdeas.forEach((idea, index) => {
    const title = normalizeText(idea?.title);
    const example = normalizeText(idea?.example);
    if (title && example && title === example) {
      errors.push(
        `${pathPrefix}[${index}]: starter title and example must not be identical`
      );
    }
    if (title && example && textSimilarity(title, example) >= 0.85) {
      errors.push(
        `${pathPrefix}[${index}]: starter title and example are too similar`
      );
    }
  });
}

function getMinActionsPerScene(activityStyle) {
  return activityStyle === "simple" ? 2 : 3;
}

function validateActions(actions, activityStyle, path, errors, youngestAge) {
  if (!Array.isArray(actions) || actions.length === 0) {
    errors.push(`${path}: actions must contain at least one item`);
    return;
  }
  const budget = getDevelopmentalComplexityBudget(youngestAge, activityStyle);
  const min = getMinActionsPerScene(activityStyle);
  const max = budget.maxActionsPerScene;
  if (actions.length < min || actions.length > max) {
    errors.push(
      `${path}: expected ${min}–${max} actions for ${activityStyle} activity, got ${actions.length}`
    );
  }
  actions.forEach((action, index) => {
    const text = asString(action);
    if (!text) {
      errors.push(`${path}[${index}]: action must not be empty`);
      return;
    }
    for (const pattern of VAGUE_ACTION_PATTERNS) {
      if (pattern.test(text)) {
        errors.push(`${path}[${index}]: action is too vague: "${text}"`);
      }
    }
  });
}

function validateDoneWhen(doneWhen, path, errors) {
  const text = asString(doneWhen);
  if (!text) {
    errors.push(`${path}: doneWhen is required`);
    return;
  }
  for (const pattern of GENERIC_DONE_WHEN) {
    if (pattern.test(text)) {
      errors.push(`${path}: doneWhen is too generic: "${text}"`);
    }
  }
}

function validateSetupGuide(activity, errors, warnings) {
  const uses = Array.isArray(activity.uses) ? activity.uses : [];
  const setupEffort = activity?.traits?.setupEffort;
  const needsSetup =
    uses.length > 0 && setupEffort !== "very-low" && setupEffort !== "low";

  const setup = activity?.setupGuide;
  const steps = Array.isArray(setup?.steps) ? setup.steps : [];
  const needed = Array.isArray(setup?.needed) ? setup.needed : [];

  if (needsSetup && steps.length === 0 && needed.length === 0) {
    errors.push("setupGuide: required when activity has supplies or setup effort");
  }

  if (steps.length === 0 && needed.length === 0) return;

  const setupText = collectActivityText({
    setupGuide: setup,
    story: "",
    stepDetails: [],
    starterIdeas: [],
  });

  for (const word of INVENTED_LOCATION_WORDS) {
    const regex = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "i");
    let usedInSteps = false;
    for (const step of activity?.stepDetails || []) {
      for (const action of step?.actions || []) {
        if (regex.test(action)) usedInSteps = true;
      }
    }
    if (usedInSteps && !regex.test(setupText)) {
      warnings.push(
        `setupGuide: "${word}" appears in scene actions but may not be defined in setup`
      );
    }
  }
}

function validateUnusedSupplies(activity, warnings) {
  const uses = (Array.isArray(activity.uses) ? activity.uses : [])
    .map(asString)
    .filter(Boolean);
  if (uses.length === 0) return;

  const haystack = collectActivityText(activity);
  for (const item of uses) {
    const keyword = item.split(/\s+/)[0].toLowerCase();
    if (keyword.length >= 4 && !haystack.includes(keyword)) {
      warnings.push(`uses: "${item}" may be unused in setup, scenes, or finish`);
    }
  }
}

function validateParentIndependence(activity, errors) {
  if (activity?.adultHelp !== "none") return;
  const haystack = collectActivityText(activity);
  for (const pattern of PARENT_DEPENDENT) {
    if (pattern.test(haystack)) {
      errors.push(
        `independent activity (${activity.adultHelp}) must not require parent help in copy`
      );
      break;
    }
  }
}

function validateRepetition(activity, warnings) {
  const story = asString(activity?.story);
  const role = asString(activity?.roleGuide?.description);
  const setup = (activity?.setupGuide?.steps || []).join(" ");
  const scene1Actions = (activity?.stepDetails?.[0]?.actions || []).join(" ");

  const pairs = [
    ["story", story, "role description", role],
    ["story", story, "setup", setup],
    ["story", story, "scene 1", scene1Actions],
    ["role description", role, "scene 1", scene1Actions],
  ];

  for (const [labelA, textA, labelB, textB] of pairs) {
    if (!textA || !textB) continue;
    const similarity = textSimilarity(textA, textB);
    if (similarity >= 0.7) {
      warnings.push(
        `${labelA} and ${labelB} are ${Math.round(similarity * 100)}% similar`
      );
    }
  }
}

/**
 * @param {object} activity
 * @param {{ youngestAge?: number|null }} [context]
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateActivityClarity(activity, context = {}) {
  const errors = [];
  const warnings = [];

  if (!activity || typeof activity !== "object") {
    return { valid: false, errors: ["activity is required"], warnings };
  }

  const formatVersion = Number(activity.activityFormatVersion);
  if (formatVersion !== 3 && !isActivityFormatV4(activity)) {
    return { valid: true, errors: [], warnings: ["skipped: not V3/V4"] };
  }

  const youngestAge = Number.isFinite(Number(context.youngestAge))
    ? Number(context.youngestAge)
    : Number.isFinite(Number(activity?.ageFit?.minAge))
      ? Number(activity.ageFit.minAge)
      : null;

  validateSetupGuide(activity, errors, warnings);
  validateParentIndependence(activity, errors);
  validateUnusedSupplies(activity, warnings);
  validateRepetition(activity, warnings);

  validateStarterIdeas(activity.starterIdeas, "starterIdeas", errors);

  const activityStyle = activity.activityStyle === "simple" ? "simple" : "imaginative";

  (activity.stepDetails || []).forEach((step, index) => {
    const path = `stepDetails[${index}]`;
    validateActions(step?.actions, activityStyle, `${path}.actions`, errors, youngestAge);
    validateDoneWhen(step?.doneWhen, `${path}.doneWhen`, errors);
    validateStarterIdeas(step?.starterIdeas, `${path}.starterIdeas`, errors);
  });

  validateDoneWhen(activity?.finishGuide?.doneWhen, "finishGuide.doneWhen", errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
