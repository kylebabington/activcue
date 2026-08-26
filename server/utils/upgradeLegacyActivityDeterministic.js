/**
 * Deterministic legacy → V3 field mapping.
 * Only maps existing content — never invents substantive story/roles/steps.
 *
 * Returns { activity, upgraded: boolean, skippedReasons: string[] }
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function mapStarterIdeas(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((idea) => {
      if (typeof idea === "string") {
        const text = idea.trim();
        if (!text) return null;
        return { title: text.slice(0, 40), example: text, kind: "choice" };
      }
      if (!idea || typeof idea !== "object") return null;
      const example = asString(idea.example || idea.text || idea.title);
      if (!example) return null;
      return {
        title: asString(idea.title) || example.slice(0, 40),
        example,
        kind: asString(idea.kind) || "choice",
      };
    })
    .filter(Boolean);
}

function mapStep(step) {
  if (!step || typeof step !== "object") return null;
  const title = asString(step.title);
  const actions = asStringArray(step.actions);
  const instruction = asString(step.instruction);
  if (actions.length === 0 && instruction) {
    actions.push(
      ...instruction
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter(Boolean)
    );
  }
  if (!title && actions.length === 0) return null;

  return {
    title: title || "Scene",
    actions,
    starterIdeas: mapStarterIdeas(step.starterIdeas),
    doneWhen: asString(step.doneWhen),
    ifStuck: asString(step.ifStuck),
    roleInstructions: Array.isArray(step.roleInstructions)
      ? step.roleInstructions
      : [],
    instruction: instruction || actions.join(" "),
  };
}

/**
 * Upgrade a legacy cached activity using only deterministic field maps.
 * Does not invent Player roles, wrap-up finishers, or fake starters.
 */
export function upgradeLegacyActivityDeterministic(raw) {
  const skippedReasons = [];
  if (!raw || typeof raw !== "object") {
    return { activity: null, upgraded: false, skippedReasons: ["missing-activity"] };
  }

  const activity = structuredClone(raw);
  let upgraded = false;

  if (!asString(activity.story) && asString(activity.mission)) {
    activity.story = asString(activity.mission);
    upgraded = true;
  }

  if (
    (!activity.setupGuide || typeof activity.setupGuide !== "object") &&
    Array.isArray(activity.uses) &&
    activity.uses.length > 0
  ) {
    activity.setupGuide = {
      needed: asStringArray(activity.uses),
      steps: asStringArray(activity.setupSteps || activity.setup),
      readyWhen: asString(activity.readyWhen),
    };
    upgraded = true;
  } else if (
    activity.setupGuide &&
    Array.isArray(activity.uses) &&
    (!Array.isArray(activity.setupGuide.needed) ||
      activity.setupGuide.needed.length === 0)
  ) {
    activity.setupGuide = {
      ...activity.setupGuide,
      needed: asStringArray(activity.uses),
    };
    upgraded = true;
  }

  if (
    (!Array.isArray(activity.starterIdeas) || activity.starterIdeas.length === 0) &&
    (Array.isArray(activity.starters) || Array.isArray(activity.examples))
  ) {
    activity.starterIdeas = mapStarterIdeas(
      activity.starters || activity.examples
    );
    if (activity.starterIdeas.length > 0) upgraded = true;
  }

  const legacySteps = Array.isArray(activity.stepDetails)
    ? activity.stepDetails
    : Array.isArray(activity.steps)
      ? activity.steps
      : [];
  if (legacySteps.length > 0) {
    const mapped = legacySteps.map(mapStep).filter(Boolean);
    if (mapped.length > 0) {
      activity.stepDetails = mapped;
      upgraded = true;
    }
  }

  if (
    (!activity.finishGuide || typeof activity.finishGuide !== "object") &&
    (Array.isArray(activity.extensionIdeas) ||
      Array.isArray(activity.extensions) ||
      asString(activity.finish))
  ) {
    activity.finishGuide = {
      action: asString(activity.finish),
      example: "",
      doneWhen: asString(activity.finishDoneWhen),
      extensions: asStringArray(
        activity.extensionIdeas || activity.extensions
      ),
    };
    upgraded = true;
  } else if (
    activity.finishGuide &&
    Array.isArray(activity.extensionIdeas) &&
    (!Array.isArray(activity.finishGuide.extensions) ||
      activity.finishGuide.extensions.length === 0)
  ) {
    activity.finishGuide = {
      ...activity.finishGuide,
      extensions: asStringArray(activity.extensionIdeas),
    };
    upgraded = true;
  }

  if (!activity.activityFormatVersion || Number(activity.activityFormatVersion) < 3) {
    // Only stamp V3 when we actually have V3-shaped core fields already present.
    const hasV3Shape =
      asString(activity.story) &&
      activity.setupGuide &&
      Array.isArray(activity.stepDetails) &&
      activity.stepDetails.length > 0 &&
      activity.finishGuide;
    if (hasV3Shape) {
      activity.activityFormatVersion = 3;
      upgraded = true;
    } else {
      skippedReasons.push("insufficient-v3-shape");
    }
  }

  if (!asString(activity.activityStyle) && asString(activity.style)) {
    activity.activityStyle = asString(activity.style);
    upgraded = true;
  }

  return { activity, upgraded, skippedReasons };
}
