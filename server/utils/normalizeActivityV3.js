import {
  normalizeAgeFit,
  normalizeCategories,
  normalizeStarterIdeas,
  normalizeTraits,
  resolveActivityStyle,
} from "./normalizeRequest.js";
import { inferVisualThemeFromActivity } from "./normalizeShared.js";

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function pickEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function dedupeActions(actions) {
  const seen = new Set();
  const result = [];
  for (const raw of actions) {
    const text = asString(raw);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function deriveInstructionFromActions(actions) {
  return actions.join(" ");
}

function normalizeSetupGuide(setupGuide, uses = []) {
  const source =
    setupGuide && typeof setupGuide === "object" && !Array.isArray(setupGuide)
      ? setupGuide
      : {};

  const needed = asStringArray(source.needed);
  const steps = asStringArray(source.steps);
  const readyWhen = asString(source.readyWhen);

  if (needed.length === 0 && uses.length > 0) {
    needed.push(...uses.slice(0, 8));
  }

  return {
    needed,
    steps,
    readyWhen:
      readyWhen ||
      (steps.length > 0
        ? "You have finished the setup steps and can start Scene 1."
        : "You are ready to begin."),
  };
}

function normalizeFinishGuide(finishGuide, extensionIdeas = []) {
  const source =
    finishGuide && typeof finishGuide === "object" && !Array.isArray(finishGuide)
      ? finishGuide
      : {};

  const extensions = asStringArray(source.extensions);
  const legacyExtensions = asStringArray(extensionIdeas);

  return {
    action: asString(source.action, "Wrap up the activity."),
    example: asString(source.example),
    doneWhen: asString(source.doneWhen, "You have finished the ending."),
    extensions:
      extensions.length > 0
        ? extensions
        : legacyExtensions.length > 0
          ? legacyExtensions
          : [],
  };
}

function normalizeRoleGuideV3(roleGuide, fallbacks = {}) {
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

  const name = asString(source.name, asString(fallbacks.kidRole, "Player"));
  const description = asString(
    source.description,
    asString(fallbacks.summary, "You get to play this activity.")
  );

  return {
    name,
    description,
    goal: asString(source.goal, description),
    firstAction: asString(
      source.firstAction,
      "Look around and pick a spot to begin."
    ),
    childRoles,
  };
}

function normalizeStepDetailsV3(stepDetails, activity = {}) {
  if (!Array.isArray(stepDetails)) return [];

  return stepDetails
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;

      const title = asString(raw.title, `Step ${index + 1}`);
      const actions = dedupeActions(raw.actions || []);
      const instruction = deriveInstructionFromActions(actions);

      const roleInstructions = Array.isArray(raw.roleInstructions)
        ? raw.roleInstructions
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              roleName: asString(item.roleName, "Player"),
              instruction: asString(item.instruction),
            }))
            .filter((item) => item.instruction)
        : [];

      const starterIdeas = normalizeStarterIdeas(raw.starterIdeas);

      const step = {
        title,
        actions,
        instruction,
        starterIdeas,
        doneWhen: asString(raw.doneWhen),
        ifStuck: asString(raw.ifStuck),
        roleInstructions,
      };

      return {
        ...step,
        title: title || `Step ${index + 1}`,
      };
    })
    .filter(Boolean);
}

function deriveV1FieldsFromV3(activity, fallbackAges = []) {
  const roleGuide = normalizeRoleGuideV3(activity.roleGuide, activity);
  const ageFit = normalizeAgeFit(activity.ageFit, fallbackAges);
  const starterIdeas = normalizeStarterIdeas(
    activity.starterIdeas,
    activity.starterPrompts
  );
  const stepDetails = normalizeStepDetailsV3(activity.stepDetails, {
    ...activity,
    roleGuide,
  });

  const stepsFromDetails = stepDetails.map((step) =>
    step.title && step.instruction && step.title !== step.instruction
      ? `${step.title}: ${step.instruction}`
      : step.instruction || step.title
  );

  const finishGuide = normalizeFinishGuide(
    activity.finishGuide,
    activity.extensionIdeas
  );

  return {
    roleGuide,
    ageFit,
    starterIdeas,
    stepDetails,
    setupGuide: normalizeSetupGuide(activity.setupGuide, activity.uses),
    finishGuide,
    extensionIdeas: finishGuide.extensions,
    kidRole: asString(activity.kidRole) || roleGuide.name,
    mission: asString(activity.mission) || roleGuide.goal,
    theme: asString(activity.theme) || asString(activity.story),
    story: asString(activity.story),
    steps:
      asStringArray(activity.steps).length > 0
        ? asStringArray(activity.steps)
        : stepsFromDetails,
    starterPrompts:
      asStringArray(activity.starterPrompts).length > 0
        ? asStringArray(activity.starterPrompts)
        : starterIdeas.map((idea) => idea.example || idea.title),
    firstMoves:
      asStringArray(activity.firstMoves).length > 0
        ? asStringArray(activity.firstMoves)
        : starterIdeas.slice(0, 4).map((idea) => idea.example || idea.title),
    roles:
      asStringArray(activity.roles).length > 0
        ? asStringArray(activity.roles)
        : roleGuide.childRoles.length > 0
          ? roleGuide.childRoles.map((role) => role.roleTitle || role.childName)
          : roleGuide.name
            ? [roleGuide.name]
            : [],
  };
}

export function normalizeActivityV3(activity, safeActivityStyle, fallbackAges = []) {
  const activityStyle = resolveActivityStyle(
    activity?.activityStyle,
    safeActivityStyle
  );

  const derived = deriveV1FieldsFromV3(
    {
      ...activity,
      activityStyle,
    },
    fallbackAges
  );

  return {
    ...activity,
    activityFormatVersion: 3,
    activityStyle,
    visualTheme: inferVisualThemeFromActivity({ ...activity, activityStyle }),
    summary: asString(activity.summary),
    story: asString(activity.story),
    theme: derived.theme,
    ...derived,
    uses: asStringArray(activity.uses),
    categories: normalizeCategories(activity.categories),
    traits: normalizeTraits(activity.traits),
  };
}

export function isActivityFormatV3(activity) {
  return Number(activity?.activityFormatVersion) >= 3;
}

export {
  dedupeActions,
  deriveInstructionFromActions,
  normalizeSetupGuide,
  normalizeFinishGuide,
  normalizeStepDetailsV3,
};
