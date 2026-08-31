import {
  normalizeAgeFit,
  normalizeCategories,
  normalizeStarterIdeas,
  normalizeTraits,
  resolveActivityStyle,
} from "./normalizeRequest.js";
import { inferVisualThemeFromActivity } from "./normalizeShared.js";
import {
  ACTIVE_ACTIVITY_FORMAT_VERSION,
  QUALITY_CONTRACT_VERSION,
} from "./activityFormatConstants.js";
import { isActivityFormatV4 } from "./activityFormat.js";
import {
  dedupeActions,
  deriveInstructionFromActions,
  normalizeSetupGuide,
  normalizeRoleGuideV3,
} from "./normalizeActivityV3.js";

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

/**
 * Preserve causal fields exactly as provided — never invent from storyBeat or legacy mirrors.
 */
function normalizeFinishGuideV4(finishGuide, extensionIdeas = []) {
  const source =
    finishGuide && typeof finishGuide === "object" && !Array.isArray(finishGuide)
      ? finishGuide
      : {};

  const extensions = asStringArray(source.extensions);
  const legacyExtensions = asStringArray(extensionIdeas);
  const resolution = asString(source.resolution);

  return {
    action: asString(source.action),
    example: asString(source.example),
    doneWhen: asString(source.doneWhen),
    ...(resolution ? { resolution } : {}),
    extensions:
      extensions.length > 0
        ? extensions
        : legacyExtensions.length > 0
          ? legacyExtensions
          : [],
  };
}

function normalizeStepDetailsV4(stepDetails) {
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
      const sceneSetup = asString(raw.sceneSetup);
      const sceneOutcome = asString(raw.sceneOutcome);

      const step = {
        title,
        actions,
        instruction,
        starterIdeas,
        doneWhen: asString(raw.doneWhen),
        ifStuck: asString(raw.ifStuck),
        roleInstructions,
        ...(sceneSetup ? { sceneSetup } : {}),
        ...(sceneOutcome ? { sceneOutcome } : {}),
      };

      return {
        ...step,
        title: title || `Step ${index + 1}`,
      };
    })
    .filter(Boolean);
}

function deriveV1FieldsFromV4(activity, fallbackAges = []) {
  const roleGuide = normalizeRoleGuideV3(activity.roleGuide, activity);
  const ageFit = normalizeAgeFit(activity.ageFit, fallbackAges);
  const starterIdeas = normalizeStarterIdeas(
    activity.starterIdeas,
    activity.starterPrompts
  );
  const stepDetails = normalizeStepDetailsV4(activity.stepDetails);
  const stepsFromDetails = stepDetails.map((step) =>
    step.title && step.instruction && step.title !== step.instruction
      ? `${step.title}: ${step.instruction}`
      : step.instruction || step.title
  );
  const finishGuide = normalizeFinishGuideV4(
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
    mission: asString(activity.mission) || asString(activity.story),
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

export function normalizeActivityV4(activity, safeActivityStyle, fallbackAges = []) {
  const activityStyle = resolveActivityStyle(
    activity?.activityStyle,
    safeActivityStyle
  );

  const derived = deriveV1FieldsFromV4(
    {
      ...activity,
      activityStyle,
    },
    fallbackAges
  );

  const qualityContractVersion = Number.isFinite(
    Number(activity?.qualityContractVersion)
  )
    ? Number(activity.qualityContractVersion)
    : QUALITY_CONTRACT_VERSION;

  return {
    ...activity,
    activityFormatVersion: ACTIVE_ACTIVITY_FORMAT_VERSION,
    qualityContractVersion,
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

export { isActivityFormatV4, normalizeStepDetailsV4, normalizeFinishGuideV4 };
