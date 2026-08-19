// src/utils/buildNarrationText.js

import {
  getActivityMissionText,
  getActivityRoleLabel,
  getStarterIdeaText,
  getStarterIdeas,
  getStepDetails,
  getStepStarterIdeas,
  getStepStuckPrompts,
} from "./activityVisualTheme";
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
 * @param {"mission"|"role"|"starters"|"starter"|"step"|"next"|"stuck"|"materials"|"finish"} section
 * @param {{ stepIndex?: number, starterIndex?: number, stuckPromptIndex?: number, selectedRoleName?: string, roleAssignments?: object, includeDoneWhen?: boolean }} [options]
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

  if (section === "mission") {
    return joinSentences([
      mission || activity?.summary || activity?.theme || "",
    ]);
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
    if (roleGuide?.goal) {
      roleParts.push(roleGuide.goal);
    }
    if (roleGuide?.firstAction) {
      roleParts.push(`Start by: ${roleGuide.firstAction}`);
    }

    if (childRoles.length > 0) {
      childRoles.forEach((role) => {
        const name = role.childName || "Player";
        const title = role.roleTitle || "helper";
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
    return joinSentences([
      getStarterIdeaText(idea) || `Idea ${index + 1}`,
    ]);
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
    const isImaginative = activity?.activityStyle === "imaginative";
    const sceneLabel = isImaginative ? "Scene" : "Step";
    const heading = step.title
      ? `${sceneLabel} ${stepIndex + 1}. ${step.title}`
      : `${sceneLabel} ${stepIndex + 1}`;
    const parts = [heading, instruction];

    const roleParts = getStepRoleParts(step, {
      selectedRoleName,
      roleAssignments,
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
    const extensions = Array.isArray(activity.extensionIdeas)
      ? activity.extensionIdeas.filter(Boolean)
      : [];
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
