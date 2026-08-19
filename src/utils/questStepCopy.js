/**
 * Kid-facing step copy helpers.
 * The scene/step instruction always stays the main instruction.
 * Role lines supplement it and must never replace it.
 */

export function getSceneInstruction(step) {
  if (!step || typeof step !== "object") return "";
  return String(step.instruction || "").trim();
}

const GENERIC_DONE_WHEN_PATTERNS = [
  /you finished this (step|scene|part)/i,
  /finished this part of the activity/i,
  /you completed this (step|scene|part)/i,
  /this (step|scene|part) is (done|finished|complete)/i,
  /when you finish this/i,
  /the objective is complete/i,
  /something in the story has changed/i,
  /ready to (move on|continue) when you finish/i,
  /^you finished\.?$/i,
  /^this step is done\.?$/i,
  /^you(?:'ve| have) finished this\.?$/i,
];

const IRREGULAR_PARTICIPLES = {
  add: "added",
  build: "built",
  choose: "chosen",
  draw: "drawn",
  dump: "dumped",
  find: "found",
  get: "gotten",
  give: "given",
  hang: "hung",
  leave: "left",
  make: "made",
  put: "put",
  read: "read",
  run: "run",
  see: "seen",
  set: "set",
  sit: "sat",
  write: "written",
};

const OBJECT_READY_VERBS = new Set([
  "choose",
  "collect",
  "find",
  "get",
  "grab",
  "pick",
  "take",
]);

export function isGenericDoneWhen(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  return GENERIC_DONE_WHEN_PATTERNS.some((pattern) => pattern.test(text));
}

function firstSentence(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  return match ? match[0].trim() : trimmed;
}

function ensurePeriod(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function toPresentPerfect(imperative) {
  const stripped = String(imperative || "")
    .replace(/[.!?]+$/, "")
    .trim();
  const match = stripped.match(/^([A-Za-z']+)(.*)$/);
  if (!match) return "";

  const verb = match[1].toLowerCase();
  const rest = match[2] || "";
  if (OBJECT_READY_VERBS.has(verb) && rest.trim()) {
    return ensurePeriod(`You have${rest}`);
  }

  const clauseRest = rest.split(/\s+and\s+/i)[0];
  const participle =
    IRREGULAR_PARTICIPLES[verb] ||
    (verb.endsWith("e")
      ? `${verb}d`
      : /[^aeiou]y$/i.test(verb)
        ? `${verb.slice(0, -1)}ied`
        : `${verb}ed`);
  return ensurePeriod(`You have ${participle}${clauseRest}`);
}

/**
 * Keep specific completion cues. Replace missing/generic ones with a cue
 * derived from this step's action so kids are never told "when you finish this step."
 */
export function resolveDoneWhen(step) {
  const existing = String(step?.doneWhen || "").trim();
  if (existing && !isGenericDoneWhen(existing)) {
    return ensurePeriod(existing);
  }

  const action =
    firstSentence(step?.instruction) || firstSentence(step?.title);
  const synthesized = toPresentPerfect(action);
  if (synthesized && !isGenericDoneWhen(synthesized)) {
    return synthesized;
  }

  if (action && !isGenericDoneWhen(action)) {
    return ensurePeriod(`You can show this: ${action.replace(/[.!?]+$/, "")}`);
  }

  return "You can point to one finished result from what you just did.";
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
