// src/utils/readingMode.js

import { getGroupAgeContext, resolveChildAge } from "./childAge";

export const SPEECH_RATE_SLOW = 0.85;
export const SPEECH_RATE_NORMAL = 0.95;

/**
 * Age-based Listening Mode defaults from youngest playing child.
 * @param {number} youngestAgeYears
 */
export function resolveReadingModeDefaults(youngestAgeYears) {
  const age = Number(youngestAgeYears);

  if (!Number.isFinite(age) || age <= 9) {
    return {
      enabled: true,
      autoAdvance: true,
      speechRate: 0.9,
      showNextPrompt: true,
    };
  }

  if (age <= 11) {
    return {
      enabled: false,
      autoAdvance: false,
      speechRate: SPEECH_RATE_NORMAL,
      showNextPrompt: true,
    };
  }

  return {
    enabled: false,
    autoAdvance: false,
    speechRate: 1,
    showNextPrompt: false,
  };
}

/**
 * Merge stored preference over age defaults.
 * @param {{ preference?: object|null, youngestAgeYears?: number }} input
 */
export function resolveReadingMode({ preference, youngestAgeYears } = {}) {
  const defaults = resolveReadingModeDefaults(youngestAgeYears);
  if (!preference || typeof preference !== "object") {
    return { ...defaults };
  }

  const next = { ...defaults };

  if (typeof preference.enabled === "boolean") {
    next.enabled = preference.enabled;
  }
  if (typeof preference.autoAdvance === "boolean") {
    next.autoAdvance = preference.autoAdvance;
  }
  if (typeof preference.showNextPrompt === "boolean") {
    next.showNextPrompt = preference.showNextPrompt;
  }

  const rate = Number(preference.speechRate);
  if (Number.isFinite(rate) && rate > 0) {
    next.speechRate = rate;
  } else if (preference.speechSpeed === "slow") {
    next.speechRate = SPEECH_RATE_SLOW;
  } else if (preference.speechSpeed === "normal") {
    next.speechRate = SPEECH_RATE_NORMAL;
  }

  return next;
}

/**
 * Youngest age among playing child profiles.
 * @param {object[]} [children]
 */
export function getYoungestPlayingAgeYears(children = []) {
  const ages = (Array.isArray(children) ? children : [])
    .map((child) => resolveChildAge(child).ageYears)
    .filter((age) => Number.isFinite(age));

  if (ages.length === 0) {
    return 7;
  }

  return getGroupAgeContext(ages).youngestAge;
}

/**
 * Normalize settings form values into a preference object (or null for defaults).
 * @param {{ useAgeDefaults?: boolean, enabled?: boolean, autoAdvance?: boolean, speechSpeed?: "slow"|"normal" }} values
 */
export function buildReadingModePreference(values = {}) {
  if (values.useAgeDefaults) {
    return null;
  }

  return {
    enabled: Boolean(values.enabled),
    autoAdvance: Boolean(values.autoAdvance),
    speechSpeed: values.speechSpeed === "slow" ? "slow" : "normal",
    speechRate:
      values.speechSpeed === "slow" ? SPEECH_RATE_SLOW : SPEECH_RATE_NORMAL,
    showNextPrompt: values.showNextPrompt !== false,
  };
}
