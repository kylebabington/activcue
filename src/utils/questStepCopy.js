import { getSceneBeatTitle } from "./sceneBeatTitles.js";

/**
 * Kid-facing step copy helpers.
 * The scene/step instruction always stays the main instruction.
 * Role lines supplement it and must never replace it.
 */

export function getSceneInstruction(step) {
  if (!step || typeof step !== "object") return "";
  return String(step.instruction || "").trim();
}

function normalizeTitleText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[.!?:;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRedundantSceneTitle(title, instruction) {
  const t = normalizeTitleText(title);
  const i = normalizeTitleText(instruction);
  if (!t) return true;
  if (!i) return false;

  const first = normalizeTitleText(firstSentence(instruction));
  if (t === first || first.startsWith(`${t} `) || first.startsWith(`${t}:`)) {
    return true;
  }
  if (i.startsWith(`${t} `) || i.startsWith(`${t}:`) || i === t) {
    return true;
  }

  const titleWords = t.split(" ").filter(Boolean);
  if (titleWords.length >= 6) return true;

  const firstWords = first.split(" ").filter(Boolean);
  if (
    titleWords.length >= 2 &&
    firstWords.slice(0, titleWords.length).join(" ") === t
  ) {
    return true;
  }

  return false;
}

/**
 * Scene titles are short story beats, never the first words of the how-to.
 */
export function resolveSceneTitle(step, activity = {}, index = 0) {
  const instruction = String(step?.instruction || "").trim();
  const title = String(step?.title || "").trim();
  const isImaginative = activity?.activityStyle === "imaginative";

  if (
    title &&
    !title.includes(".") &&
    wordCount(title) <= 6 &&
    !isRedundantSceneTitle(title, instruction)
  ) {
    return title;
  }

  if (!isImaginative) {
    return `Step ${Number(index) + 1}`;
  }

  return getSceneBeatTitle(activity?.visualTheme, index);
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

const GENERIC_IF_STUCK_PATTERNS = [
  /simpler version of this (step|scene|part|move)/i,
  /simplest version of this (step|scene|part|move)/i,
  /skip the fancy version/i,
  /do a simpler version of this step and move on/i,
];

export function isGenericIfStuck(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  return GENERIC_IF_STUCK_PATTERNS.some((pattern) => pattern.test(text));
}

export function resolveIfStuck(step) {
  const existing = String(step?.ifStuck || "").trim();
  if (existing && !isGenericIfStuck(existing)) {
    return ensurePeriod(existing);
  }

  const action =
    firstSentence(step?.instruction) || firstSentence(step?.title);
  if (action && !isGenericIfStuck(action)) {
    return ensurePeriod(
      `Try the easiest piece first: ${action.replace(/[.!?]+$/, "")}`
    );
  }

  return "Try the easiest piece of what you see and start there.";
}

function countSentences(value) {
  return String(value || "")
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function isThinSceneInstruction(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  const sentences = countSentences(text);
  const words = wordCount(text);
  if (words <= 14) return true;
  if (sentences < 3) return true;
  return false;
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "your",
  "this",
  "that",
  "with",
  "from",
  "for",
  "on",
  "in",
  "as",
  "is",
  "are",
  "it",
  "into",
  "then",
  "each",
  "one",
  "you",
]);

function significantWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function sharesStepLanguage(candidate, stepText) {
  const stepWords = new Set(significantWords(stepText));
  if (stepWords.size === 0) return false;
  const hits = significantWords(candidate).filter((word) => stepWords.has(word));
  return hits.length >= 2;
}

function firstConcreteHint(step) {
  const examples = Array.isArray(step?.examples)
    ? step.examples.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  if (examples[0]) return examples[0];

  const ideas = Array.isArray(step?.starterIdeas) ? step.starterIdeas : [];
  for (const idea of ideas) {
    const hint = String(idea?.example || idea?.title || "").trim();
    if (hint) return hint;
  }
  return "";
}

function suppliesForThisScene(uses, stepText) {
  const items = (Array.isArray(uses) ? uses : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const stepWords = new Set(significantWords(stepText));
  return items
    .filter((item) =>
      significantWords(item).some((word) => stepWords.has(word))
    )
    .slice(0, 3);
}

function supplySentence(items) {
  if (items.length === 0) return "";
  if (items.length === 1) {
    return `Use ${items[0]} for this part`;
  }
  const last = items[items.length - 1];
  const head = items.slice(0, -1).join(", ");
  return `Use ${head} and ${last} for this part`;
}

function uniqueSentences(parts) {
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const text = String(part || "").trim();
    if (!text) continue;
    const key = text.toLowerCase().replace(/[.!?]+$/, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(ensurePeriod(text));
  }
  return out;
}

/**
 * Cached and generated scenes often arrive as labels.
 * Expand those using THIS scene's action, examples, and matching supplies.
 * Never borrow objects or jobs from a different activity.
 */
export function resolveSceneInstruction(step, activity = {}, stepIndex = 0) {
  const existing = String(step?.instruction || "").trim();
  if (activity?.activityStyle === "simple") {
    return existing;
  }

  if (existing && !isThinSceneInstruction(existing)) {
    return ensurePeriod(existing);
  }

  const title = String(step?.title || "").trim();
  const action = existing || title || "Start this scene with one clear move";
  const example = firstConcreteHint(step);
  const stepText = [title, action, example].filter(Boolean).join(" ");
  const firstAction = String(activity?.roleGuide?.firstAction || "").trim();
  const stuck = String(step?.ifStuck || "").trim();
  const supplies = suppliesForThisScene(activity?.uses, stepText);

  const parts = [];
  parts.push(action);

  if (
    Number(stepIndex) === 0 &&
    firstAction &&
    firstAction.toLowerCase() !== action.toLowerCase() &&
    sharesStepLanguage(firstAction, stepText)
  ) {
    parts.push(firstAction);
  }

  if (example && example.toLowerCase() !== action.toLowerCase()) {
    parts.push(`Do it like this: ${example}`);
  }

  const supplyLine = supplySentence(supplies);
  if (supplyLine) {
    parts.push(supplyLine);
  }

  if (stuck && !isGenericIfStuck(stuck)) {
    const stuckBody = stuck.replace(/[.!?]+$/, "");
    parts.push(
      `If that is hard, ${stuckBody.charAt(0).toLowerCase()}${stuckBody.slice(1)}`
    );
  }

  if (countSentences(uniqueSentences(parts).join(" ")) < 3) {
    const bare = action.replace(/[.!?]+$/, "");
    parts.push(
      `Start with one piece of this: ${bare}, then add the next piece you can see`
    );
  }

  return uniqueSentences(parts).join(" ");
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
