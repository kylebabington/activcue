// src/utils/buildNarrationText.js

import {
  getActivityMissionText,
  getActivityRoleLabel,
  getStarterIdeas,
  getStepDetails,
  getStepStuckPrompts,
} from "./activityVisualTheme";

function joinSentences(parts) {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(" ");
}

function resolveStepInstruction(step, selectedRoleName, roleAssignments) {
  if (!step) return "";
  const roleInstructions = Array.isArray(step.roleInstructions)
    ? step.roleInstructions
    : [];
  const assignedRoles = Object.values(roleAssignments || {}).filter(Boolean);
  const preferredRoles = [selectedRoleName, ...assignedRoles].filter(Boolean);

  for (const roleName of preferredRoles) {
    const match = roleInstructions.find(
      (entry) =>
        entry?.roleName &&
        entry.roleName.toLowerCase() === String(roleName).toLowerCase()
    );
    if (match?.instruction) return match.instruction;
  }
  return step.instruction || "";
}

/**
 * Compose spoken scripts from Activity Format V2 fields.
 * @param {object} activity
 * @param {"mission"|"role"|"starters"|"starter"|"step"|"next"|"stuck"} section
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

  if (section === "mission" || section === "role") {
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
    } else if (mission) {
      roleParts.push(mission);
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
    const ideaLines = starters.map((idea, index) => {
      const title = idea?.title || `Idea ${index + 1}`;
      const example = idea?.example ? ` For example: ${idea.example}` : "";
      return `${title}.${example}`;
    });
    return joinSentences([intro, ...ideaLines]);
  }

  if (section === "starter") {
    const index = Number(options.starterIndex) || 0;
    const idea = starters[index];
    if (!idea) return "";
    return joinSentences([
      idea.title || `Idea ${index + 1}`,
      idea.example ? `For example: ${idea.example}` : "",
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

    const instruction = resolveStepInstruction(
      step,
      selectedRoleName,
      roleAssignments
    );
    const parts = [
      step.title ? `${step.title}` : `Step ${stepIndex + 1}`,
      instruction,
    ];

    if (options.includeDoneWhen !== false && step.doneWhen) {
      parts.push(`You're done when: ${step.doneWhen}`);
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

  return "";
}
