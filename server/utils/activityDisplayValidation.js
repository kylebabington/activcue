/**
 * Authoritative display-ready validator for activities shown in the quest UI.
 *
 * Two contracts:
 * - ActivityGenerationV3: everything the AI must produce (includes whyItFits).
 * - CachedActivityV3: reusable shared-library payload (excludes household-specific
 *   fields such as whyItFits, child names/IDs, moment/user/household IDs).
 *
 * Normalization filler does NOT make an activity valid. Generic defaults like
 * "Player" and "Wrap up the activity." are rejected.
 */

const GENERIC_ROLE_NAMES = new Set(["player", "player 1", "player 2", "kid", "child"]);
const GENERIC_FINISH_ACTIONS = [
  /^wrap up the activity\.?$/i,
  /^finish the activity\.?$/i,
  /^you'?re done\.?$/i,
];
const GENERIC_DONE_WHEN = [
  /you'?re done with the step/i,
  /finish(ed)? this (step|scene|part)/i,
  /complete(d)? the scene/i,
  /move on when you'?re ready/i,
  /you finished this/i,
  /this (step|scene|part) is (done|finished|complete)/i,
  /^you have finished the ending\.?$/i,
];
const GENERIC_IF_STUCK = [
  /^ask for help\.?$/i,
  /^try again\.?$/i,
  /^keep going\.?$/i,
  /^figure it out\.?$/i,
];
const MEANINGFUL_MIN_CHARS = 12;

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isMeaningful(text, min = MEANINGFUL_MIN_CHARS) {
  return asString(text).length >= min;
}

function push(errors, code) {
  if (code && !errors.includes(code)) {
    errors.push(code);
  }
}

function resolveStyle(activity) {
  const style = asString(activity?.activityStyle || activity?.style).toLowerCase();
  return style === "simple" ? "simple" : style === "imaginative" ? "imaginative" : "";
}

function resolveAgeFit(activity) {
  const fit =
    activity?.ageFit && typeof activity.ageFit === "object" ? activity.ageFit : {};
  return {
    minAge: Number(fit.minAge ?? activity?.minAge ?? activity?.age_min),
    maxAge: Number(fit.maxAge ?? activity?.maxAge ?? activity?.age_max),
    targetAges: Array.isArray(fit.targetAges)
      ? fit.targetAges
      : Array.isArray(activity?.targetAges)
        ? activity.targetAges
        : Array.isArray(activity?.target_ages)
          ? activity.target_ages
          : [],
    maturityLevel: asString(fit.maturityLevel ?? activity?.maturityLevel),
    independenceLevel: asString(
      fit.independenceLevel ?? activity?.independenceLevel
    ),
    ageFitReason: asString(fit.ageFitReason ?? activity?.ageFitReason),
  };
}

function countStarterIdeas(list) {
  if (!Array.isArray(list)) return 0;
  return list.filter((idea) => {
    if (!idea || typeof idea !== "object") return false;
    return isMeaningful(idea.example || idea.title, 8);
  }).length;
}

function validateIdentity(activity, errors) {
  if (!isMeaningful(activity?.title, 3)) push(errors, "missing-title");
  if (!resolveStyle(activity)) push(errors, "missing-activity-style");
  if (!isMeaningful(activity?.visualTheme, 3)) push(errors, "missing-visual-theme");
  if (!isMeaningful(activity?.summary, 20)) push(errors, "missing-summary");
  if (!Number.isFinite(Number(activity?.estimatedMinutes))) {
    push(errors, "missing-estimated-minutes");
  }
  if (!asString(activity?.energy)) push(errors, "missing-energy");
  if (!asString(activity?.mess)) push(errors, "missing-mess");
  if (!asString(activity?.adultHelp)) push(errors, "missing-adult-help");
  if (!Array.isArray(activity?.categories) || activity.categories.length === 0) {
    push(errors, "missing-categories");
  }
  if (!activity?.traits || typeof activity.traits !== "object") {
    push(errors, "missing-traits");
  }
}

function validateAge(activity, errors) {
  const age = resolveAgeFit(activity);
  if (!Number.isFinite(age.minAge)) push(errors, "missing-min-age");
  if (!Number.isFinite(age.maxAge)) push(errors, "missing-max-age");
  if (!Array.isArray(age.targetAges) || age.targetAges.length === 0) {
    push(errors, "missing-target-ages");
  }
  if (!isMeaningful(age.maturityLevel, 3)) push(errors, "missing-maturity-level");
  if (!isMeaningful(age.independenceLevel, 3)) {
    push(errors, "missing-independence-level");
  }
  if (!isMeaningful(age.ageFitReason, 16)) push(errors, "missing-age-fit-reason");
}

function validateStoryAndRole(activity, errors) {
  const style = resolveStyle(activity);
  const story = asString(activity?.story || activity?.mission);
  if (!isMeaningful(story, style === "imaginative" ? 40 : 20)) {
    push(errors, "missing-story");
  }

  const role = activity?.roleGuide;
  const roleName = asString(role?.name || role?.roleTitle);
  const roleDescription = asString(role?.description);

  if (!isMeaningful(roleName, 3)) {
    push(errors, "missing-role");
  } else if (GENERIC_ROLE_NAMES.has(roleName.toLowerCase())) {
    push(errors, "generic-role-filler");
  }

  if (!isMeaningful(roleDescription, 20)) {
    push(errors, "missing-role-description");
  }

  const childRoles = Array.isArray(role?.childRoles) ? role.childRoles : [];
  for (const childRole of childRoles) {
    const name = asString(childRole?.childName || childRole?.name);
    if (GENERIC_ROLE_NAMES.has(name.toLowerCase())) {
      push(errors, "generic-role-filler");
    }
  }
}

function validateSetupAndSupplies(activity, errors) {
  const uses = Array.isArray(activity?.uses) ? activity.uses.filter(Boolean) : [];
  const setup = activity?.setupGuide;
  const needed = Array.isArray(setup?.needed) ? setup.needed.filter(Boolean) : [];
  const steps = Array.isArray(setup?.steps) ? setup.steps.filter(Boolean) : [];

  if (uses.length === 0 && needed.length === 0) {
    push(errors, "missing-supplies");
  }
  if (steps.length === 0) {
    push(errors, "missing-setup-steps");
  }
  if (!isMeaningful(setup?.readyWhen, 12)) {
    push(errors, "missing-setup-ready-when");
  }
}

function validateFinish(activity, errors) {
  const finish = activity?.finishGuide;
  const action = asString(finish?.action);
  if (!isMeaningful(action, 12)) {
    push(errors, "missing-finish");
  } else if (GENERIC_FINISH_ACTIONS.some((pattern) => pattern.test(action))) {
    push(errors, "generic-finish-filler");
  }

  const doneWhen = asString(finish?.doneWhen);
  if (!isMeaningful(doneWhen, 12)) {
    push(errors, "missing-finish-done-when");
  } else if (GENERIC_DONE_WHEN.some((pattern) => pattern.test(doneWhen))) {
    push(errors, "generic-finish-done-when");
  }
}

function validateSteps(activity, errors) {
  const steps = Array.isArray(activity?.stepDetails) ? activity.stepDetails : [];
  if (steps.length === 0) {
    push(errors, "missing-steps");
    return;
  }

  const style = resolveStyle(activity);
  const minActions = style === "simple" ? 2 : 1;
  const minStarters = style === "imaginative" ? 1 : 1;

  steps.forEach((step, index) => {
    const n = index + 1;
    if (!isMeaningful(step?.title, 3)) {
      push(errors, `step-${n}-missing-title`);
    }

    const actions = Array.isArray(step?.actions)
      ? step.actions.map(asString).filter(Boolean)
      : [];
    const instruction = asString(step?.instruction);
    if (actions.length < minActions && !isMeaningful(instruction, 20)) {
      push(errors, `step-${n}-missing-actions`);
    }

    const starters = countStarterIdeas(step?.starterIdeas);
    if (starters < minStarters) {
      push(errors, `step-${n}-missing-starter-ideas`);
    }

    const doneWhen = asString(step?.doneWhen);
    if (!isMeaningful(doneWhen, 12)) {
      push(errors, `step-${n}-missing-done-when`);
    } else if (GENERIC_DONE_WHEN.some((pattern) => pattern.test(doneWhen))) {
      push(errors, `step-${n}-generic-done-when`);
    }

    const ifStuck = asString(step?.ifStuck);
    if (!isMeaningful(ifStuck, 12)) {
      push(errors, `step-${n}-missing-if-stuck`);
    } else if (GENERIC_IF_STUCK.some((pattern) => pattern.test(ifStuck))) {
      push(errors, `step-${n}-generic-if-stuck`);
    }
  });

  const topStarters = countStarterIdeas(activity?.starterIdeas);
  if (topStarters < 1 && style === "imaginative") {
    // Top-level starters are preferred; step-level can compensate if all steps have them.
    const allStepsHaveStarters = steps.every(
      (step) => countStarterIdeas(step?.starterIdeas) >= 1
    );
    if (!allStepsHaveStarters) {
      push(errors, "missing-starter-ideas");
    }
  }
}

/**
 * Validate an activity for quest UI display.
 * Use mode "cached" (default) for shared-library payloads.
 * Use mode "generation" when validating fresh AI output (whyItFits required).
 *
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateActivityForDisplay(activity, { mode = "cached" } = {}) {
  const errors = [];

  if (!activity || typeof activity !== "object") {
    return { valid: false, errors: ["missing-activity"] };
  }

  validateIdentity(activity, errors);
  validateAge(activity, errors);
  validateStoryAndRole(activity, errors);
  validateSetupAndSupplies(activity, errors);
  validateFinish(activity, errors);
  validateSteps(activity, errors);

  if (mode === "generation") {
    if (!isMeaningful(activity?.whyItFits, 16)) {
      push(errors, "missing-why-it-fits");
    }
  }

  // Cached contract must not require household-specific fields; strip check only warns via absence.
  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Fields that must never be required / stored for CachedActivityV3. */
export const CACHED_ACTIVITY_EXCLUDED_FIELDS = [
  "whyItFits",
  "childId",
  "childIds",
  "profileId",
  "userId",
  "householdId",
  "momentId",
  "presentedAt",
];

export function isCachedActivityPayloadClean(activity) {
  if (!activity || typeof activity !== "object") return false;
  return CACHED_ACTIVITY_EXCLUDED_FIELDS.every(
    (key) => activity[key] == null || activity[key] === ""
  );
}
