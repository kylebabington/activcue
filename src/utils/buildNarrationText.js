// src/utils/buildNarrationText.js

import {
  getActivityMissionText,
  getActivityRoleLabel,
  getActivityStoryText,
  getFinishGuide,
  getSetupGuide,
  getStarterIdeaText,
  getStarterIdeas,
  getStepActions,
  getStepDetails,
  getStepStarterIdeas,
  getStepStoryBeat,
  getStepSceneOutcome,
  getStepStuckPrompts,
  isActivityFormatV3,
} from "./activityVisualTheme";
import { getBoundChildRoleNarration } from "./resolveParticipantRoleBindings";
import { getSceneInstruction, getStepRoleParts } from "./questStepCopy";

function joinSentences(parts) {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(" ");
}

/**
 * Compose spoken scripts from Activity Format V2 fields.
 * @param {object} activity
 * @param {"mission"|"role"|"starters"|"starter"|"step"|"next"|"stuck"|"materials"|"finish"|"setup"|"story"} section
 * @param {{ stepIndex?: number, starterIndex?: number, stuckPromptIndex?: number, selectedRoleName?: string, roleAssignments?: object, playingChildren?: object[], includeDoneWhen?: boolean }} [options]
 */
export function buildNarrationText(activity, section, options = {}) {
  if (!activity) return "";

  const steps = getStepDetails(activity);
  const starters = getStarterIdeas(activity);
  const roleGuide = activity.roleGuide;
  const roleName = getActivityRoleLabel(activity);
  const mission = getActivityMissionText(activity);
  const selectedRoleName = options.selectedRoleName || roleName;
  const roleAssignments = options.roleAssignments || {};
  const playingChildren = Array.isArray(options.playingChildren)
    ? options.playingChildren
    : [];

  if (section === "story" || section === "mission") {
    return joinSentences([
      mission || activity?.summary || activity?.theme || activity?.story || "",
    ]);
  }

  if (section === "setup") {
    const setup = getSetupGuide(activity);
    if (!setup) return "";
    const parts = [
      "Get everything ready before Scene 1. The timer starts after you press Ready.",
    ];
    const story = getActivityStoryText(activity);
    if (story) {
      parts.push(story);
    }
    if (setup.needed.length > 0) {
      parts.push(
        setup.needed.length === 1
          ? `Get ${setup.needed[0]}`
          : `Get ${setup.needed.join(", ")}`
      );
    }
    setup.steps.forEach((step, index) => {
      const prefix = index === 0 ? "First" : index === setup.steps.length - 1 ? "Last" : "Next";
      parts.push(`${prefix}, ${step}`);
    });
    if (setup.readyWhen) {
      parts.push(`You are ready when ${setup.readyWhen}`);
    }
    return joinSentences(parts);
  }

  if (section === "role") {
    const childRoles = Array.isArray(roleGuide?.childRoles)
      ? roleGuide.childRoles
      : [];
    const roleParts = [];

    if (roleName) {
      roleParts.push(`You are the ${roleName}`);
    }
    if (roleGuide?.description) {
      roleParts.push(roleGuide.description);
    }
    if (!isActivityFormatV3(activity) && roleGuide?.goal) {
      roleParts.push(roleGuide.goal);
    }
    if (!isActivityFormatV3(activity) && roleGuide?.firstAction) {
      roleParts.push(`Start by: ${roleGuide.firstAction}`);
    }

    if (childRoles.length > 0) {
      const boundRoles = getBoundChildRoleNarration({
        childRoles,
        playingChildren,
        roleAssignments,
      });
      boundRoles.forEach((role) => {
        const name = role.name || "Player";
        const title = role.title || "helper";
        roleParts.push(`${name} is the ${title}`);
        if (role.responsibility) roleParts.push(role.responsibility);
        if (role.firstAction) {
          roleParts.push(`${name}, start by: ${role.firstAction}`);
        }
      });
    }

    return joinSentences(roleParts);
  }

  if (section === "starters") {
    if (starters.length === 0) return "";
    const intro =
      starters.length === 1
        ? "Here is a starter idea"
        : `Here are ${starters.length} starter ideas`;
    const ideaLines = starters
      .map((idea) => getStarterIdeaText(idea))
      .filter(Boolean);
    return joinSentences([intro, ...ideaLines]);
  }

  if (section === "starter") {
    const index = Number(options.starterIndex) || 0;
    const idea = starters[index];
    if (!idea) return "";
    return joinSentences([getStarterIdeaText(idea) || `Idea ${index + 1}`]);
  }

  if (section === "step" || section === "next") {
    let stepIndex = Number(options.stepIndex);
    if (!Number.isFinite(stepIndex)) {
      const completed = Array.isArray(activity.completedStepIndexes)
        ? activity.completedStepIndexes
        : [];
      stepIndex = steps.findIndex((_, index) => !completed.includes(index));
      if (stepIndex < 0) {
        stepIndex = Math.max(0, steps.length - 1);
      }
    }

    const step = steps[stepIndex];
    if (!step) return "";

    const instruction = getSceneInstruction(step);
    const actions = getStepActions(step);
    const isImaginative = activity?.activityStyle === "imaginative";
    const sceneLabel = isImaginative ? "Scene" : "Step";
    const heading = step.title
      ? `${sceneLabel} ${stepIndex + 1}. ${step.title}`
      : `${sceneLabel} ${stepIndex + 1}`;
    const parts = [heading];

    const storyBeat = getStepStoryBeat(step);
    if (storyBeat) {
      parts.push(storyBeat);
    }

    if (actions.length > 1) {
      actions.forEach((action, actionIndex) => {
        const prefix =
          actionIndex === 0
            ? "First"
            : actionIndex === actions.length - 1
              ? "Last"
              : "Next";
        parts.push(`${prefix}, ${action}`);
      });
    } else {
      parts.push(instruction);
    }

    const roleParts = getStepRoleParts(step, {
      selectedRoleName,
      roleAssignments,
      playingChildren,
      childRoles: Array.isArray(activity?.roleGuide?.childRoles)
        ? activity.roleGuide.childRoles
        : [],
    });
    if (roleParts.length > 0) {
      const roleLines = roleParts.map((entry) => {
        const who = entry.childName || entry.roleName;
        return `${who}: ${entry.instruction}`;
      });
      parts.push(`Your part. ${roleLines.join(" ")}`);
    }

    const stepStarters = getStepStarterIdeas(step);
    if (stepStarters.length > 0) {
      const selectedIndex = Number(options.selectedStarterIndex);
      const ordered = [...stepStarters];
      if (
        Number.isFinite(selectedIndex) &&
        selectedIndex >= 0 &&
        selectedIndex < ordered.length
      ) {
        const [selected] = ordered.splice(selectedIndex, 1);
        ordered.unshift(selected);
      }
      const starterLines = ordered
        .map((idea) => getStarterIdeaText(idea))
        .filter(Boolean);
      parts.push(`You could try: ${starterLines.join(". ")}`);
    }

    if (options.includeDoneWhen !== false && step.doneWhen) {
      const doneWhenLabel = isImaginative
        ? "Ready to move on when"
        : "You're done when";
      parts.push(`${doneWhenLabel}: ${step.doneWhen}`);
    }

    return joinSentences(parts);
  }

  if (section === "scene-outcome") {
    const stepIndex = Number(options.stepIndex) || 0;
    const step = steps[stepIndex];
    if (!step) return "";
    const outcome = getStepSceneOutcome(step);
    if (!outcome) return "";
    return joinSentences([outcome]);
  }

  if (section === "stuck") {
    const stepIndex = Number(options.stepIndex) || 0;
    const step = steps[stepIndex];
    if (!step) return "";
    const prompts = getStepStuckPrompts(step);
    if (prompts.length === 0) {
      return joinSentences([step.ifStuck || "Try the simplest version."]);
    }
    const promptIndex = Number.isFinite(Number(options.stuckPromptIndex))
      ? Number(options.stuckPromptIndex)
      : 0;
    const safeIndex =
      ((promptIndex % prompts.length) + prompts.length) % prompts.length;
    return joinSentences([prompts[safeIndex]]);
  }

  if (section === "materials") {
    const uses = Array.isArray(activity.uses) ? activity.uses.filter(Boolean) : [];
    if (uses.length === 0) {
      return joinSentences(["Use whatever you already have nearby."]);
    }
    return joinSentences([
      uses.length === 1
        ? `You need ${uses[0]}`
        : `You need ${uses.join(", ")}`,
    ]);
  }

  if (section === "finish") {
    const finishGuide = getFinishGuide(activity);
    if (finishGuide.action || finishGuide.resolution) {
      const parts = [];
      if (finishGuide.resolution) parts.push(finishGuide.resolution);
      if (finishGuide.action) parts.push(finishGuide.action);
      if (finishGuide.example) parts.push(`For example: ${finishGuide.example}`);
      if (finishGuide.doneWhen) parts.push(`Done when ${finishGuide.doneWhen}`);
      return joinSentences(parts);
    }

    const extensions = finishGuide.extensions;
    if (extensions.length === 0) {
      return joinSentences([
        activity.activityStyle === "imaginative"
          ? "When the last scene is done, wrap the story and celebrate"
          : "When the last step is done, you are finished",
      ]);
    }
    return joinSentences([
      "When you are ready to wrap up, try one of these",
      ...extensions,
    ]);
  }

  return "";
}
