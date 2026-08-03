import {
  ACTIVITY_CATEGORIES,
  CREATIVITY_VALUES,
  MOVEMENT_TRAIT_VALUES,
  SETUP_EFFORT_VALUES,
  SOCIAL_MODE_VALUES,
  STRUCTURE_VALUES,
} from "../schemas/activityTaxonomy.js";

const CATEGORY_SET = new Set(ACTIVITY_CATEGORIES);

function pickEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function resolveActivityStyle(activityStyle, activityMode) {
  if (activityStyle === "simple" || activityStyle === "imaginative") {
    return activityStyle;
  }

  if (activityMode === "simple" || activityMode === "imaginative") {
    return activityMode;
  }

  return "simple";
}

export function buildSafeCurrentMoment(body) {
  const {
    currentMoment,
    parentActivity,
    parentAvailability,
    messLevel,
    activitySpace,
    safetySettings,
  } = body;

  return {
    parentActivity:
      currentMoment?.parentActivity ||
      parentActivity ||
      "Doing a household task",
    availability:
      currentMoment?.availability || parentAvailability || "ask-first",
    timeNeededMinutes: Number(
      currentMoment?.timeNeededMinutes ||
        safetySettings?.maxActivityMinutes ||
        20
    ),
    space: currentMoment?.space || activitySpace || "Living room",
    messLevel: currentMoment?.messLevel || messLevel || "low",
    noiseLevel:
      currentMoment?.noiseLevel ||
      (safetySettings?.quietMode ? "quiet" : "normal"),
    supervisionLevel:
      currentMoment?.supervisionLevel || "mostly-independent",
  };
}

export function buildSafeSafetySettings(safeCurrentMoment, safetySettings) {
  return {
    screenFreeOnly: safetySettings?.screenFreeOnly ?? true,
    noFoodActivities: safetySettings?.noFoodActivities ?? false,
    noWaterPlay: safetySettings?.noWaterPlay ?? true,
    noSmallObjects: safetySettings?.noSmallObjects ?? true,
    quietMode: safeCurrentMoment.noiseLevel === "quiet",
    maxActivityMinutes: safeCurrentMoment.timeNeededMinutes,
    adultHelpAllowed:
      safeCurrentMoment.supervisionLevel === "independent"
        ? "none"
        : safeCurrentMoment.supervisionLevel === "mostly-independent"
          ? "optional"
          : safetySettings?.adultHelpAllowed || "optional",
  };
}

export function normalizeCategories(categories) {
  if (!Array.isArray(categories)) {
    return [];
  }

  const unique = [];
  for (const raw of categories) {
    if (typeof raw !== "string") {
      continue;
    }
    const value = raw.trim().toLowerCase();
    if (CATEGORY_SET.has(value) && !unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique;
}

export function normalizeTraits(traits) {
  const source =
    traits && typeof traits === "object" && !Array.isArray(traits) ? traits : {};

  return {
    setupEffort: pickEnum(source.setupEffort, SETUP_EFFORT_VALUES, "medium"),
    structure: pickEnum(source.structure, STRUCTURE_VALUES, "open-ended"),
    socialMode: pickEnum(source.socialMode, SOCIAL_MODE_VALUES, "flexible"),
    creativity: pickEnum(source.creativity, CREATIVITY_VALUES, "medium"),
    movement: pickEnum(source.movement, MOVEMENT_TRAIT_VALUES, "low"),
  };
}

export function normalizeActivity(activity, safeActivityStyle) {
  return {
    ...activity,
    activityStyle:
      activity.activityStyle === "simple" ||
      activity.activityStyle === "imaginative"
        ? activity.activityStyle
        : safeActivityStyle,
    starterPrompts: Array.isArray(activity.starterPrompts)
      ? activity.starterPrompts
      : [],
    firstMoves: Array.isArray(activity.firstMoves) ? activity.firstMoves : [],
    steps: Array.isArray(activity.steps) ? activity.steps : [],
    roles: Array.isArray(activity.roles) ? activity.roles : [],
    extensionIdeas: Array.isArray(activity.extensionIdeas)
      ? activity.extensionIdeas
      : [],
    uses: Array.isArray(activity.uses) ? activity.uses : [],
    categories: normalizeCategories(activity.categories),
    traits: normalizeTraits(activity.traits),
  };
}
