// server/utils/activityAgePolicy.js
// Single authority for activity age eligibility, maturity, complexity, and ranking.

import { getGroupAgeContext } from "./childAge.js";
import {
  validateAgeContentFit,
  validateActivityVoiceQuality,
  validateMixedAgeRoles,
} from "./ageFitValidation.js";

export const AGE_POLICY_VERSION = 2;

/** Refined developmental bands used by age policy + prompts. */
export const POLICY_AGE_BANDS = Object.freeze([
  "young-child",
  "early-elementary",
  "elementary",
  "older-elementary",
  "tween",
  "young-teen",
  "teen",
]);

const YOUNG_CHILD_CONTENT_PATTERNS = [
  /\bblanket\s+fort\b/i,
  /\bpillow\s+fort\b/i,
  /\bcushion\s+fort\b/i,
  /\bcozy\s+fort\b/i,
  /\bstuffed\s+animal\b/i,
  /\bfairy\s+(tea|garden|castle|dust)\b/i,
  /\bprincess\s+(castle|tea|dress[- ]?up)\b/i,
  /\btea\s+party\b/i,
  /\bbaby\s+doll\b/i,
  /\bnursery\b/i,
];

const ABSTRACT_PLANNING_PATTERNS = [
  /\boptimal\s+sequence\b/i,
  /\bdetermine\s+the\s+optimal\b/i,
  /\bcommunication\s+network\b/i,
  /\bdesign\s+a\s+(system|network|protocol)\b/i,
  /\bmulti[- ]?stage\s+planning\b/i,
  /\binfer\s+(the\s+)?(missing|rest)\b/i,
  /\bdesign\s+the\s+rules\s+before\b/i,
];

/**
 * Policy age band for a single year of age.
 * @param {number} age
 * @returns {typeof POLICY_AGE_BANDS[number]}
 */
export function getPolicyAgeBand(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < 0) {
    return "elementary";
  }
  if (n <= 5) return "young-child";
  if (n <= 7) return "early-elementary";
  if (n <= 9) return "elementary";
  if (n <= 11) return "older-elementary";
  if (n === 12) return "tween";
  if (n <= 14) return "young-teen";
  return "teen";
}

/**
 * Single-child expected maturity. Family mode may allow mixed-age when span is meaningful.
 * @param {number} age
 * @param {string} [activityMode]
 * @param {object} [childrenContext] — array of children or { ages } / ages array
 * @returns {"young-child"|"child"|"tween"|"teen"|"mixed-age"}
 */
export function getExpectedMaturityLevel(
  age,
  activityMode = "single-child",
  childrenContext = null
) {
  const ages = extractAges(childrenContext);
  if (ages.length === 0 && Number.isFinite(Number(age))) {
    ages.push(Number(age));
  }

  const mode = String(activityMode || "single-child").toLowerCase();
  const isFamily =
    mode === "family" || mode === "mixed" || mode === "multi-child";
  const group = getGroupAgeContext(ages);

  if (isFamily && group.isMixedAge && ages.length >= 2) {
    return "mixed-age";
  }

  const focusAge = Number.isFinite(Number(age))
    ? Number(age)
    : group.oldestAge || group.youngestAge;
  if (!Number.isFinite(focusAge)) {
    return "child";
  }
  if (focusAge <= 5) return "young-child";
  if (focusAge <= 9) return "child";
  if (focusAge <= 12) return "tween";
  return "teen";
}

/**
 * Hard + soft evaluation of whether an activity fits the selected children.
 * @returns {{ eligible: boolean, score: number, reasons: string[], warnings: string[] }}
 */
export function evaluateActivityAgeFit({
  activity,
  childrenContext = [],
  activityMode = "single-child",
  requireValidated = false,
  expectedStyle = null,
} = {}) {
  const reasons = [];
  const warnings = [];
  const ages = extractAges(childrenContext);
  const ageFit = resolveAgeFit(activity);

  if (expectedStyle) {
    const style = String(
      activity?.activityStyle || activity?.style || ""
    ).trim();
    if (style && style !== expectedStyle) {
      reasons.push("wrong-style");
    }
  }

  if (requireValidated) {
    const validated = resolveAgeFitValidated(activity);
    if (validated !== true) {
      reasons.push("unvalidated-age-metadata");
    }
  } else if (resolveAgeFitValidated(activity) === false) {
    warnings.push("unvalidated-age-metadata");
  }

  if (ages.length > 0) {
    if (!ageFit || !Number.isFinite(ageFit.minAge) || !Number.isFinite(ageFit.maxAge)) {
      reasons.push("age-range-mismatch");
    } else {
      const inRange = ages.every(
        (age) => age >= ageFit.minAge && age <= ageFit.maxAge
      );
      if (!inRange) {
        reasons.push("age-range-mismatch");
      }
    }

    const maturity = String(ageFit?.maturityLevel || "").trim();
    const mode = String(activityMode || "single-child").toLowerCase();
    const isFamily =
      mode === "family" || mode === "mixed" || mode === "multi-child";
    const group = getGroupAgeContext(ages);
    const oldest = group.oldestAge;
    const expected = getExpectedMaturityLevel(oldest, activityMode, ages);

    if (maturity === "mixed-age") {
      if (!isFamily || !group.isMixedAge || ages.length < 2) {
        reasons.push("mixed-age-only");
      }
    } else if (maturity) {
      if (!maturityMatchesExpected(maturity, expected, oldest)) {
        reasons.push("maturity-mismatch");
      }
    }

    const complexity = validateDevelopmentalComplexity(activity, ages);
    if (!complexity.ok) {
      reasons.push("developmental-complexity");
      warnings.push(...complexity.warnings);
    }

    const childrenObjs = normalizeChildrenContext(childrenContext, ages);
    const content = validateAgeContentFit(activity, childrenObjs);
    if (!content.ok) {
      for (const r of content.reasons) {
        if (r === "maturity-too-young") {
          if (!reasons.includes("maturity-mismatch")) {
            reasons.push("maturity-mismatch");
          }
        } else if (
          r === "young-child-content-for-older" ||
          r === "teen-pretend-story"
        ) {
          if (!reasons.includes("developmental-complexity")) {
            reasons.push("developmental-complexity");
          }
        } else if (!reasons.includes(r)) {
          reasons.push(r);
        }
      }
    }

    if (isFamily && group.isMixedAge) {
      const mixed = validateMixedAgeRoles(activity, childrenObjs);
      if (!mixed.ok) {
        warnings.push(...mixed.reasons);
      }
    }

    const voice = validateActivityVoiceQuality(activity);
    if (!voice.ok) {
      warnings.push(...voice.reasons);
    }
  }

  const eligible = reasons.length === 0;
  const score = eligible ? scoreActivityAgeMatch(activity, ages) : 0;

  return { eligible, score, reasons, warnings };
}

/**
 * Soft ranking score after hard filters pass.
 */
export function scoreActivityAgeMatch(activity, ages = []) {
  const list = normalizeAges(ages);
  if (list.length === 0) {
    return 0;
  }

  const ageFit = resolveAgeFit(activity);
  if (!ageFit) {
    return 0;
  }

  const { minAge, maxAge, targetAges } = ageFit;
  let score = 0;

  for (const age of list) {
    if (!Number.isFinite(minAge) || !Number.isFinite(maxAge)) {
      continue;
    }
    if (age < minAge || age > maxAge) {
      continue;
    }

    const targets = Array.isArray(targetAges)
      ? targetAges.map(Number).filter(Number.isFinite)
      : [];

    if (targets.includes(age)) {
      score += 12;
    } else if (targets.some((t) => Math.abs(t - age) === 1)) {
      score += 8;
    } else if (targets.some((t) => Math.abs(t - age) === 2)) {
      score += 4;
    } else {
      score += 0;
    }
  }

  score += ageSpanPenalty(minAge, maxAge);
  return score;
}

/**
 * Developmental complexity limits aligned with validateDevelopmentalComplexity.
 */
export function getDevelopmentalComplexityBudget(youngestAge, activityStyle = "imaginative") {
  const youngest = Number(youngestAge);
  const style = String(activityStyle || "imaginative").toLowerCase();
  if (!Number.isFinite(youngest)) {
    return {
      maxScenes: 5,
      maxActionsPerScene: style === "simple" ? 6 : 7,
      maxSetupSteps: 5,
    };
  }
  if (youngest <= 7) {
    return {
      maxScenes: 4,
      maxActionsPerScene: 4,
      maxSetupSteps: 5,
    };
  }
  if (youngest <= 9) {
    return {
      maxScenes: 5,
      maxActionsPerScene: 6,
      maxSetupSteps: 5,
    };
  }
  return {
    maxScenes: 5,
    maxActionsPerScene: style === "simple" ? 6 : 7,
    maxSetupSteps: 5,
  };
}

/**
 * Developmental complexity limits by age band of the youngest focus child.
 * @returns {{ ok: boolean, warnings: string[] }}
 */
export function validateDevelopmentalComplexity(activity, ages = []) {
  const warnings = [];
  const list = normalizeAges(ages);
  if (list.length === 0) {
    return { ok: true, warnings };
  }

  const youngest = Math.min(...list);
  const oldest = Math.max(...list);
  const text = collectActivityText(activity);
  const scenes = countScenes(activity);
  const maxActions = maxActionsPerScene(activity);
  const setupSteps = countSetupSteps(activity);

  if (youngest <= 7) {
    if (scenes > 4) {
      warnings.push("too-many-scenes");
    }
    if (maxActions > 4) {
      warnings.push("too-many-actions-per-scene");
    }
    if (setupSteps > 5) {
      warnings.push("too-many-setup-steps");
    }
    if (ABSTRACT_PLANNING_PATTERNS.some((p) => p.test(text))) {
      warnings.push("abstract-planning");
    }
  } else if (youngest <= 9) {
    if (scenes > 5) {
      warnings.push("too-many-scenes");
    }
    if (maxActions > 6) {
      warnings.push("too-many-actions-per-scene");
    }
  }

  if (oldest >= 13) {
    const hitsYoung = YOUNG_CHILD_CONTENT_PATTERNS.some((p) => p.test(text));
    const maturity = String(
      resolveAgeFit(activity)?.maturityLevel || ""
    ).trim();
    if (hitsYoung && maturity !== "teen") {
      warnings.push("preschool-framing-for-teen");
    }
    if (maturity === "young-child" || maturity === "child") {
      warnings.push("immature-framing-for-teen");
    }
  }

  const hardFail = warnings.some((w) =>
    [
      "too-many-scenes",
      "too-many-actions-per-scene",
      "abstract-planning",
      "preschool-framing-for-teen",
      "immature-framing-for-teen",
    ].includes(w)
  );

  return { ok: !hardFail, warnings };
}

/**
 * Filter a list with the central policy. Prefer dropping bad items.
 */
export function filterActivitiesByAgePolicy(
  activities,
  childrenContext = [],
  options = {}
) {
  const list = Array.isArray(activities) ? activities : [];
  const kept = [];
  const rejectionDetails = [];
  let rejectedCount = 0;

  for (const activity of list) {
    const evaluation = evaluateActivityAgeFit({
      activity,
      childrenContext,
      activityMode: options.activityMode,
      requireValidated: options.requireValidated,
      expectedStyle: options.expectedStyle,
    });

    if (!evaluation.eligible) {
      logAgeFitEvaluation(activity, childrenContext, evaluation);
    }

    if (evaluation.eligible) {
      kept.push({ activity, score: evaluation.score, evaluation });
    } else {
      rejectedCount += 1;
      rejectionDetails.push({
        title: activity?.title || "(untitled)",
        reasons: evaluation.reasons,
        warnings: evaluation.warnings,
      });
    }
  }

  kept.sort((a, b) => b.score - a.score);

  return {
    activities: kept.map((row) => row.activity),
    scored: kept,
    rejectedCount,
    rejectionDetails,
  };
}

export function logAgeFitEvaluation(activity, childrenContext, evaluation) {
  const ages = extractAges(childrenContext);
  console.warn(
    `[ageFit] title=${JSON.stringify(activity?.title || "(untitled)")} ages=${JSON.stringify(ages)} eligible=${evaluation.eligible} reasons=${JSON.stringify(evaluation.reasons || [])} score=${evaluation.score}`
  );
}

export function logAgeFitBatchSummary(summary) {
  const {
    ages = [],
    style = null,
    cacheExamined = 0,
    wrongStyle = 0,
    ageRejected = 0,
    maturityRejected = 0,
    eligible = 0,
    returned = 0,
  } = summary || {};
  console.warn(
    `[ageFit:batch] ages=${JSON.stringify(ages)} style=${style} cacheExamined=${cacheExamined} wrongStyle=${wrongStyle} ageRejected=${ageRejected} maturityRejected=${maturityRejected} eligible=${eligible} returned=${returned}`
  );
}

// --- helpers ---

function extractAges(childrenContext) {
  if (Array.isArray(childrenContext)) {
    if (childrenContext.length === 0) return [];
    if (typeof childrenContext[0] === "number") {
      return normalizeAges(childrenContext);
    }
    return normalizeAges(
      childrenContext.map((child) =>
        typeof child === "object" && child != null
          ? child.ageYears ?? child.age
          : child
      )
    );
  }
  if (childrenContext && typeof childrenContext === "object") {
    if (Array.isArray(childrenContext.ages)) {
      return normalizeAges(childrenContext.ages);
    }
  }
  return [];
}

function normalizeAges(ages) {
  return (Array.isArray(ages) ? ages : [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age));
}

function normalizeChildrenContext(childrenContext, ages) {
  if (Array.isArray(childrenContext) && childrenContext.length > 0) {
    if (typeof childrenContext[0] === "object" && childrenContext[0] != null) {
      return childrenContext;
    }
  }
  return ages.map((ageYears, index) => ({
    name: `Child${index + 1}`,
    ageYears,
  }));
}

export function resolveAgeFit(activity) {
  if (!activity || typeof activity !== "object") {
    return null;
  }

  const fromTop = activity.ageFit;
  const fromData = activity.activity_data?.ageFit;
  const fromContent = activity.full_content?.ageFit;
  const raw = fromTop || fromData || fromContent;

  const minAge = Number(
    activity.age_min ?? activity.minAge ?? raw?.minAge
  );
  const maxAge = Number(
    activity.age_max ?? activity.maxAge ?? raw?.maxAge
  );
  const targetAges = Array.isArray(activity.target_ages)
    ? activity.target_ages
    : Array.isArray(activity.targetAges)
      ? activity.targetAges
      : Array.isArray(raw?.targetAges)
        ? raw.targetAges
        : [];
  const maturityLevel =
    activity.maturity_level ||
    activity.maturityLevel ||
    raw?.maturityLevel ||
    "";

  if (!Number.isFinite(minAge) && !Number.isFinite(maxAge) && !raw) {
    return null;
  }

  return {
    minAge: Number.isFinite(minAge) ? minAge : NaN,
    maxAge: Number.isFinite(maxAge) ? maxAge : NaN,
    targetAges: targetAges.map(Number).filter(Number.isFinite),
    maturityLevel: String(maturityLevel || "").trim(),
    independenceLevel: raw?.independenceLevel,
    ageFitReason: raw?.ageFitReason,
  };
}

function resolveAgeFitValidated(activity) {
  if (typeof activity?.age_fit_validated === "boolean") {
    return activity.age_fit_validated;
  }
  if (typeof activity?.ageFitValidated === "boolean") {
    return activity.ageFitValidated;
  }
  return null;
}

function maturityMatchesExpected(maturity, expected, oldest) {
  if (maturity === expected) {
    return true;
  }
  // Adjacent bands: tween↔teen for 12–13 edge cases only as soft — hard for single-child.
  if (expected === "young-child" && maturity === "child") {
    return oldest <= 6;
  }
  if (expected === "child" && maturity === "young-child") {
    return oldest <= 6;
  }
  if (expected === "child" && maturity === "tween") {
    return false;
  }
  if (expected === "tween" && (maturity === "child" || maturity === "teen")) {
    return maturity === "teen" ? oldest >= 12 : false;
  }
  if (expected === "teen" && maturity === "tween") {
    return oldest <= 13;
  }
  if (expected === "teen" && (maturity === "child" || maturity === "young-child")) {
    return false;
  }
  if (expected === "tween" && maturity === "young-child") {
    return false;
  }
  return false;
}

function ageSpanPenalty(minAge, maxAge) {
  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge)) {
    return 0;
  }
  const span = maxAge - minAge;
  if (span <= 2) return 0;
  if (span <= 4) return -1;
  if (span <= 6) return -3;
  return -6;
}

function countScenes(activity) {
  if (Array.isArray(activity?.stepDetails) && activity.stepDetails.length > 0) {
    return activity.stepDetails.length;
  }
  if (Array.isArray(activity?.steps) && activity.steps.length > 0) {
    return activity.steps.length;
  }
  if (Array.isArray(activity?.scenes) && activity.scenes.length > 0) {
    return activity.scenes.length;
  }
  return 0;
}

function maxActionsPerScene(activity) {
  const steps = Array.isArray(activity?.stepDetails)
    ? activity.stepDetails
    : [];
  let max = 0;
  for (const step of steps) {
    const instruction = String(step?.instruction || "");
    const sentences = instruction
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const actionCount =
      Array.isArray(step?.actions) && step.actions.length > 0
        ? step.actions.length
        : sentences.length;
    if (actionCount > max) max = actionCount;
  }
  return max;
}

function countSetupSteps(activity) {
  if (Array.isArray(activity?.setup) && activity.setup.length > 0) {
    return activity.setup.length;
  }
  if (Array.isArray(activity?.setupSteps) && activity.setupSteps.length > 0) {
    return activity.setupSteps.length;
  }
  const materials = Array.isArray(activity?.materials)
    ? activity.materials.length
    : 0;
  return materials;
}

function collectActivityText(activity) {
  const parts = [
    activity?.title,
    activity?.summary,
    activity?.theme,
    activity?.mission,
    activity?.kidRole,
    activity?.ageFit?.ageFitReason,
  ];
  for (const step of Array.isArray(activity?.stepDetails)
    ? activity.stepDetails
    : []) {
    parts.push(step?.title, step?.instruction, step?.doneWhen);
  }
  for (const prompt of Array.isArray(activity?.starterPrompts)
    ? activity.starterPrompts
    : []) {
    parts.push(prompt);
  }
  return parts.filter((p) => typeof p === "string" && p.trim()).join("\n");
}
