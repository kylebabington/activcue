import { getStepStarterIdeas } from "./activityVisualTheme";
import { isGenericIfStuck } from "./questStepCopy";

export const MAX_AI_HINTS_PER_STEP = 2;
export const MAX_AI_HINTS_PER_ACTIVITY = 4;

function uniqueSuggestions(values) {
  const seen = new Set();
  return values.filter((value) => {
    const text = String(value || "").trim();
    if (!text) return false;
    const key = text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ideaLine(idea) {
  const title = String(idea?.title || "").trim();
  const example = String(idea?.example || "").trim();
  if (title && example && title.toLowerCase() !== example.toLowerCase()) {
    return `${title}. ${example}`;
  }
  return title || example;
}

export function getAiHintsForStep(aiHintsByStepIndex, stepIndex) {
  const key = String(stepIndex);
  const list = aiHintsByStepIndex?.[key] || aiHintsByStepIndex?.[stepIndex];
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

export function countAiHints(aiHintsByStepIndex = {}) {
  return Object.values(aiHintsByStepIndex).reduce((total, list) => {
    return total + (Array.isArray(list) ? list.length : 0);
  }, 0);
}

export function canRequestAiHint(aiHintsByStepIndex, stepIndex) {
  const forStep = getAiHintsForStep(aiHintsByStepIndex, stepIndex).length;
  const total = countAiHints(aiHintsByStepIndex);
  return (
    forStep < MAX_AI_HINTS_PER_STEP && total < MAX_AI_HINTS_PER_ACTIVITY
  );
}

/**
 * Scene-specific ideas that do not require an API call.
 * Prefers this step's starter ideas and role lines over generic "try easier" copy.
 */
export function getLocalStuckSuggestions(step) {
  const fromStarters = getStepStarterIdeas(step).map(ideaLine);
  const fromRoles = Array.isArray(step?.roleInstructions)
    ? step.roleInstructions
        .map((entry) => String(entry?.instruction || "").trim())
        .filter(Boolean)
    : [];

  const originalIfStuck = String(step?.ifStuck || "").trim();
  const specificIfStuck =
    originalIfStuck && !isSynthesizedIfStuck(originalIfStuck)
      ? originalIfStuck
      : "";

  return uniqueSuggestions([...fromStarters, ...fromRoles, specificIfStuck]);
}

export function nextStuckSuggestion(suggestions, cursor) {
  const list = uniqueSuggestions(suggestions);
  if (list.length === 0) {
    return { suggestion: "", cursor: -1 };
  }
  const current = Number.isInteger(cursor) ? cursor : -1;
  const next = current < 0 ? 0 : (current + 1) % list.length;
  return { suggestion: list[next], cursor: next };
}

export function isSynthesizedIfStuck(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  return (
    isGenericIfStuck(text) || /^try the easiest piece first:/i.test(text)
  );
}
