import {
  ACTIVITY_CATEGORIES,
  CREATIVITY_VALUES,
  MOVEMENT_TRAIT_VALUES,
  SETUP_EFFORT_VALUES,
  SOCIAL_MODE_VALUES,
  STRUCTURE_VALUES,
} from "../schemas/activityTaxonomy.js";
import {
  STARTER_IDEA_KINDS,
  VISUAL_THEMES,
} from "../schemas/activitySuggestionsSchema.js";

const CATEGORY_SET = new Set(ACTIVITY_CATEGORIES);
const VISUAL_THEME_SET = new Set(VISUAL_THEMES);

function pickEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
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

export function normalizeRoleGuide(roleGuide, fallbacks = {}) {
  const source =
    roleGuide && typeof roleGuide === "object" && !Array.isArray(roleGuide)
      ? roleGuide
      : {};

  return {
    name: asString(source.name, asString(fallbacks.kidRole, "Player")),
    description: asString(
      source.description,
      asString(fallbacks.summary, "You get to play this activity.")
    ),
    goal: asString(source.goal, asString(fallbacks.mission, "Finish the activity.")),
    firstAction: asString(
      source.firstAction,
      "Look around and pick a spot to begin."
    ),
  };
}

export function normalizeStarterIdeas(starterIdeas, starterPrompts = []) {
  const ideas = [];

  if (Array.isArray(starterIdeas)) {
    for (const raw of starterIdeas) {
      if (!raw || typeof raw !== "object") continue;
      const title = asString(raw.title);
      const example = asString(raw.example);
      if (!title && !example) continue;
      ideas.push({
        title: title || "Try this",
        example: example || title,
        kind: pickEnum(raw.kind, STARTER_IDEA_KINDS, "imagination"),
      });
    }
  }

  if (ideas.length === 0 && Array.isArray(starterPrompts)) {
    for (const prompt of starterPrompts) {
      const text = asString(prompt);
      if (!text) continue;
      ideas.push({
        title: text.length > 48 ? `${text.slice(0, 45)}…` : text,
        example: text,
        kind: "imagination",
      });
    }
  }

  return ideas;
}

export function normalizeStepDetails(stepDetails, steps = []) {
  const details = [];

  if (Array.isArray(stepDetails)) {
    for (const raw of stepDetails) {
      if (!raw || typeof raw !== "object") continue;
      const title = asString(raw.title);
      const instruction = asString(raw.instruction);
      if (!title && !instruction) continue;

      const roleInstructions = Array.isArray(raw.roleInstructions)
        ? raw.roleInstructions
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              roleName: asString(item.roleName, "Player"),
              instruction: asString(item.instruction),
            }))
            .filter((item) => item.instruction)
        : [];

      details.push({
        title: title || `Step ${details.length + 1}`,
        instruction: instruction || title,
        examples: asStringArray(raw.examples),
        doneWhen: asString(
          raw.doneWhen,
          "You finished this part of the activity."
        ),
        ifStuck: asString(
          raw.ifStuck,
          "Skip the fancy version and do the simplest version of this step."
        ),
        roleInstructions,
      });
    }
  }

  if (details.length === 0 && Array.isArray(steps)) {
    for (const step of steps) {
      const text = asString(step);
      if (!text) continue;
      details.push({
        title: text.length > 56 ? `${text.slice(0, 53)}…` : text,
        instruction: text,
        examples: [],
        doneWhen: "You finished this step.",
        ifStuck: "Do a simpler version of this step and move on.",
        roleInstructions: [],
      });
    }
  }

  return details;
}

/**
 * Prefer V2 structured fields; always emit V1 mirrors so older UI keeps working.
 */
export function deriveV1FieldsFromV2(activity) {
  const roleGuide = normalizeRoleGuide(activity.roleGuide, activity);
  const starterIdeas = normalizeStarterIdeas(
    activity.starterIdeas,
    activity.starterPrompts
  );
  const stepDetails = normalizeStepDetails(activity.stepDetails, activity.steps);

  const stepsFromDetails = stepDetails.map((step) =>
    step.title && step.instruction && step.title !== step.instruction
      ? `${step.title}: ${step.instruction}`
      : step.instruction || step.title
  );

  const starterPromptsFromIdeas = starterIdeas.map(
    (idea) => idea.example || idea.title
  );

  const firstMoves =
    asStringArray(activity.firstMoves).length > 0
      ? asStringArray(activity.firstMoves)
      : starterIdeas.slice(0, 4).map((idea) => idea.title);

  const roles =
    asStringArray(activity.roles).length > 0
      ? asStringArray(activity.roles)
      : roleGuide.name
        ? [roleGuide.name]
        : [];

  return {
    roleGuide,
    starterIdeas,
    stepDetails,
    kidRole: asString(activity.kidRole) || roleGuide.name,
    mission: asString(activity.mission) || roleGuide.goal,
    steps:
      asStringArray(activity.steps).length > 0
        ? asStringArray(activity.steps)
        : stepsFromDetails,
    starterPrompts:
      asStringArray(activity.starterPrompts).length > 0
        ? asStringArray(activity.starterPrompts)
        : starterPromptsFromIdeas,
    firstMoves,
    roles,
  };
}

function inferVisualTheme(activity) {
  const raw = asString(activity.visualTheme).toLowerCase();
  if (VISUAL_THEME_SET.has(raw)) return raw;

  const haystack = [
    activity.theme,
    activity.title,
    activity.summary,
    activity.mission,
    ...(Array.isArray(activity.categories) ? activity.categories : []),
  ]
    .join(" ")
    .toLowerCase();

  const guesses = [
    ["space", /space|moon|rocket|planet|star|orbit/],
    ["jungle", /jungle|forest|nature|tree|leaf/],
    ["detective", /detect|clue|mystery|case|spy/],
    ["animals", /animal|zoo|pet|creature|wildlife/],
    ["fantasy", /magic|dragon|wizard|fairy|castle|kingdom/],
    ["building", /build|construct|tower|block|fort/],
    ["science", /science|lab|experiment|robot|invent/],
    ["art", /art|draw|paint|comic|color|craft/],
    ["expedition", /expedition|explore|map|trek|voyage/],
    ["neighborhood", /neighbor|street|town|city|community/],
    ["rescue", /rescue|save|help|emergency/],
    ["mystery", /secret|hidden|strange|unknown/],
  ];

  for (const [theme, pattern] of guesses) {
    if (pattern.test(haystack)) return theme;
  }

  return activity.activityStyle === "imaginative" ? "fantasy" : "art";
}

export function normalizeActivity(activity, safeActivityStyle) {
  const activityStyle =
    activity.activityStyle === "simple" ||
    activity.activityStyle === "imaginative"
      ? activity.activityStyle
      : safeActivityStyle;

  const derived = deriveV1FieldsFromV2({
    ...activity,
    activityStyle,
  });

  return {
    ...activity,
    activityFormatVersion: 2,
    activityStyle,
    visualTheme: inferVisualTheme({ ...activity, activityStyle }),
    theme: asString(activity.theme),
    summary: asString(activity.summary),
    ...derived,
    extensionIdeas: asStringArray(activity.extensionIdeas),
    uses: asStringArray(activity.uses),
    categories: normalizeCategories(activity.categories),
    traits: normalizeTraits(activity.traits),
  };
}
