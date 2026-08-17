/**
 * Kid-facing step copy helpers.
 * The scene/step instruction always stays the main instruction.
 * Role lines supplement it and must never replace it.
 */

export function getSceneInstruction(step) {
  if (!step || typeof step !== "object") return "";
  return String(step.instruction || "").trim();
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function findRoleInstruction(roleInstructions, roleName) {
  const needle = normalizeName(roleName);
  if (!needle) return null;
  return (
    roleInstructions.find(
      (entry) => normalizeName(entry?.roleName) === needle
    ) || null
  );
}

function findChildRole(childRoles, child) {
  const childName = normalizeName(child?.name);
  if (!childName) return null;
  return (
    childRoles.find((role) => normalizeName(role?.childName) === childName) ||
    null
  );
}

/**
 * Role-specific responsibilities for the current scene.
 * These are additive: the caller should still render getSceneInstruction(step).
 */
export function getStepRoleParts(
  step,
  {
    playingChildren = [],
    roleAssignments = {},
    childRoles = [],
    selectedRoleName = "",
  } = {}
) {
  const roleInstructions = Array.isArray(step?.roleInstructions)
    ? step.roleInstructions.filter(
        (entry) => entry?.instruction && String(entry.instruction).trim()
      )
    : [];
  if (roleInstructions.length === 0) return [];

  const safeChildRoles = Array.isArray(childRoles) ? childRoles : [];
  const assignedParts = (Array.isArray(playingChildren) ? playingChildren : [])
    .map((child) => {
      const assignedRole = roleAssignments?.[child?.id] || "";
      const childRole = findChildRole(safeChildRoles, child);
      const roleName = assignedRole || childRole?.roleTitle || "";
      const match = findRoleInstruction(roleInstructions, roleName);
      if (!match) return null;
      return {
        childName: child?.name || "Player",
        roleName: match.roleName,
        instruction: String(match.instruction).trim(),
      };
    })
    .filter(Boolean);

  if (assignedParts.length > 0) return assignedParts;

  const selected = findRoleInstruction(roleInstructions, selectedRoleName);
  const ordered = selected
    ? [selected, ...roleInstructions.filter((entry) => entry !== selected)]
    : roleInstructions;

  return ordered.map((entry) => {
    const childRole = safeChildRoles.find(
      (role) => normalizeName(role?.roleTitle) === normalizeName(entry.roleName)
    );
    return {
      childName: childRole?.childName || "",
      roleName: entry.roleName,
      instruction: String(entry.instruction).trim(),
    };
  });
}

export const ACTIVE_QUEST_STACK_ORDER = Object.freeze([
  "story",
  "stage",
  "roles",
  "supplies",
  "starters",
  "finish",
  "other",
]);
