import {
  ACTIVITY_CATEGORIES,
  CREATIVITY_VALUES,
  MOVEMENT_TRAIT_VALUES,
  SETUP_EFFORT_VALUES,
  SOCIAL_MODE_VALUES,
  STRUCTURE_VALUES,
} from "../schemas/activityTaxonomy.js";
import { STARTER_IDEA_KINDS } from "../schemas/activitySuggestionsSchema.js";
import { inferVisualThemeFromActivity } from "./normalizeShared.js";
import { normalizeActivityV3, isActivityFormatV3 } from "./normalizeActivityV3.js";
import {
  resolveDoneWhen,
  resolveIfStuck,
  resolveSceneInstruction,
  resolveSceneTitle,
} from "../../src/utils/questStepCopy.js";

const CATEGORY_SET = new Set(ACTIVITY_CATEGORIES);

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

  const childRoles = Array.isArray(source.childRoles)
    ? source.childRoles
        .filter((role) => role && typeof role === "object")
        .map((role) => ({
          childName: asString(role.childName, "Player"),
          age: Number.isFinite(Number(role.age)) ? Number(role.age) : 0,
          roleTitle: asString(role.roleTitle, asString(role.name, "Player")),
          responsibility: asString(
            role.responsibility,
            asString(role.description, "Help with the activity.")
          ),
          firstAction: asString(
            role.firstAction,
            "Look around and pick a spot to begin."
          ),
        }))
        .filter((role) => role.roleTitle || role.responsibility)
    : [];

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
    childRoles,
  };
}

const MATURITY_LEVELS = [
  "young-child",
  "child",
  "tween",
  "teen",
  "mixed-age",
];

const INDEPENDENCE_LEVELS = [
  "adult-led",
  "some-help",
  "mostly-independent",
  "independent",
];

export function normalizeAgeFit(ageFit, fallbackAges = []) {
  const source =
    ageFit && typeof ageFit === "object" && !Array.isArray(ageFit)
      ? ageFit
      : {};

  const ages = (Array.isArray(fallbackAges) ? fallbackAges : [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age));

  const fallbackMin = ages.length > 0 ? Math.min(...ages) : 5;
  const fallbackMax = ages.length > 0 ? Math.max(...ages) : 12;

  let minAge = Number(source.minAge);
  let maxAge = Number(source.maxAge);
  if (!Number.isFinite(minAge)) minAge = fallbackMin;
  if (!Number.isFinite(maxAge)) maxAge = fallbackMax;
  if (minAge > maxAge) {
    const swap = minAge;
    minAge = maxAge;
    maxAge = swap;
  }

  const targetAges = Array.isArray(source.targetAges)
    ? source.targetAges
        .map((age) => Number(age))
        .filter((age) => Number.isFinite(age))
    : ages.length > 0
      ? ages
      : [Math.round((minAge + maxAge) / 2)];

  return {
    minAge,
    maxAge,
    targetAges,
    maturityLevel: pickEnum(source.maturityLevel, MATURITY_LEVELS, "child"),
    independenceLevel: pickEnum(
      source.independenceLevel,
      INDEPENDENCE_LEVELS,
      "mostly-independent"
    ),
    ageFitReason: asString(
      source.ageFitReason,
      "Fits the participating children's ages."
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
      const resolvedExample = example || title;
      ideas.push({
        title:
          example && title && title.toLowerCase() !== example.toLowerCase()
            ? title
            : "",
        example: resolvedExample,
        kind: pickEnum(raw.kind, STARTER_IDEA_KINDS, "imagination"),
      });
    }
  }

  if (ideas.length === 0 && Array.isArray(starterPrompts)) {
    for (const prompt of starterPrompts) {
      const text = asString(prompt);
      if (!text) continue;
      ideas.push({
        title: "",
        example: text,
        kind: "imagination",
      });
    }
  }

  return ideas;
}

function synthesizeStarterIdeasFromExamples(examples) {
  return examples.slice(0, 3).map((example) => ({
    title: "",
    example,
    kind: "imagination",
  }));
}

export function normalizeStepDetails(stepDetails, steps = [], activity = {}) {
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

      const examples = asStringArray(raw.examples);
      let starterIdeas = normalizeStarterIdeas(raw.starterIdeas);
      if (starterIdeas.length === 0 && examples.length > 0) {
        starterIdeas = synthesizeStarterIdeasFromExamples(examples);
      }

      const normalizedStep = {
        title: title || `Step ${details.length + 1}`,
        instruction: instruction || title,
        starterIdeas,
        examples,
        doneWhen: asString(raw.doneWhen),
        ifStuck: asString(raw.ifStuck),
        roleInstructions,
      };
      const expandedInstruction = resolveSceneInstruction(
        normalizedStep,
        activity,
        details.length
      );
      details.push({
        ...normalizedStep,
        title: resolveSceneTitle(
          { ...normalizedStep, instruction: expandedInstruction },
          activity,
          details.length
        ),
        instruction: expandedInstruction,
        doneWhen: resolveDoneWhen(normalizedStep),
        ifStuck: resolveIfStuck(normalizedStep),
      });
    }
  }

  if (details.length === 0 && Array.isArray(steps)) {
    for (const step of steps) {
      const text = asString(step);
      if (!text) continue;
      const legacyStep = {
        title: "",
        instruction: text,
        starterIdeas: [],
        examples: [],
        roleInstructions: [],
      };
      const expandedInstruction = resolveSceneInstruction(
        legacyStep,
        activity,
        details.length
      );
      details.push({
        ...legacyStep,
        title: resolveSceneTitle(
          { ...legacyStep, instruction: expandedInstruction },
          activity,
          details.length
        ),
        instruction: expandedInstruction,
        doneWhen: resolveDoneWhen(legacyStep),
        ifStuck: resolveIfStuck(legacyStep),
      });
    }
  }

  return details;
}

/**
 * Prefer V2 structured fields; always emit V1 mirrors so older UI keeps working.
 */
export function deriveV1FieldsFromV2(activity, fallbackAges = []) {
  const roleGuide = normalizeRoleGuide(activity.roleGuide, activity);
  const ageFit = normalizeAgeFit(activity.ageFit, fallbackAges);
  const starterIdeas = normalizeStarterIdeas(
    activity.starterIdeas,
    activity.starterPrompts
  );
  const stepDetails = normalizeStepDetails(
    activity.stepDetails,
    activity.steps,
    activity
  );

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
      : starterIdeas.slice(0, 4).map((idea) => idea.example || idea.title);

  const rolesFromChildRoles = roleGuide.childRoles.map(
    (role) => role.roleTitle || role.childName
  );

  const roles =
    asStringArray(activity.roles).length > 0
      ? asStringArray(activity.roles)
      : rolesFromChildRoles.length > 0
        ? rolesFromChildRoles
        : roleGuide.name
          ? [roleGuide.name]
          : [];

  return {
    roleGuide,
    ageFit,
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

function normalizeLegacyActivity(activity, safeActivityStyle, fallbackAges = []) {
  const activityStyle =
    activity.activityStyle === "simple" ||
    activity.activityStyle === "imaginative"
      ? activity.activityStyle
      : safeActivityStyle;

  const derived = deriveV1FieldsFromV2(
    {
      ...activity,
      activityStyle,
    },
    fallbackAges
  );

  return {
    ...activity,
    activityFormatVersion: 2,
    activityStyle,
    visualTheme: inferVisualThemeFromActivity({ ...activity, activityStyle }),
    theme: asString(activity.theme),
    summary: asString(activity.summary),
    ...derived,
    extensionIdeas: asStringArray(activity.extensionIdeas),
    uses: asStringArray(activity.uses),
    categories: normalizeCategories(activity.categories),
    traits: normalizeTraits(activity.traits),
  };
}

export function normalizeActivity(activity, safeActivityStyle, fallbackAges = []) {
  if (
    isActivityFormatV3(activity) ||
    Number(activity?.activityFormatVersion) === 3
  ) {
    return normalizeActivityV3(activity, safeActivityStyle, fallbackAges);
  }

  return normalizeLegacyActivity(activity, safeActivityStyle, fallbackAges);
}
