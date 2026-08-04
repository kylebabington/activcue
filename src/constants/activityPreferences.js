// src/constants/activityPreferences.js

export const DEFAULT_ACTIVITY_PREFERENCES = {
  messTolerance: "a-little",
  setupEffort: "a-few-minutes",
  independencePreference: "mostly-independent",
  activityStylePreference: "mix",
  indoorOutdoorPreference: "either",
};

const MESS_TOLERANCE = new Set(["clean", "a-little", "fine"]);
const SETUP_EFFORT = new Set([
  "almost-none",
  "a-few-minutes",
  "bigger-ok",
]);
const INDEPENDENCE = new Set([
  "parent-led",
  "together",
  "mostly-independent",
  "fully-independent",
]);
const ACTIVITY_STYLE = new Set([
  "mostly-simple",
  "mix",
  "mostly-imaginative",
]);
const INDOOR_OUTDOOR = new Set(["indoor", "outdoor", "either"]);

function pickAllowed(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

export function normalizeActivityPreferences(raw) {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  return {
    messTolerance: pickAllowed(
      source.messTolerance,
      MESS_TOLERANCE,
      DEFAULT_ACTIVITY_PREFERENCES.messTolerance
    ),
    setupEffort: pickAllowed(
      source.setupEffort,
      SETUP_EFFORT,
      DEFAULT_ACTIVITY_PREFERENCES.setupEffort
    ),
    independencePreference: pickAllowed(
      source.independencePreference,
      INDEPENDENCE,
      DEFAULT_ACTIVITY_PREFERENCES.independencePreference
    ),
    activityStylePreference: pickAllowed(
      source.activityStylePreference,
      ACTIVITY_STYLE,
      DEFAULT_ACTIVITY_PREFERENCES.activityStylePreference
    ),
    indoorOutdoorPreference: pickAllowed(
      source.indoorOutdoorPreference,
      INDOOR_OUTDOOR,
      DEFAULT_ACTIVITY_PREFERENCES.indoorOutdoorPreference
    ),
  };
}

export const CHILD_INDEPENDENCE_LEVELS = [
  "needs-help",
  "usually-independent",
  "very-independent",
];

export function normalizeChildIndependenceLevel(value) {
  return CHILD_INDEPENDENCE_LEVELS.includes(value)
    ? value
    : "usually-independent";
}

export function normalizeChildAvoids(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 24);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  return [];
}

/**
 * Map durable activity-style preference to generation play-mode flavor id.
 * Appearance themes no longer drive this.
 */
export function playModeFlavorFromActivityStyle(activityStylePreference) {
  switch (activityStylePreference) {
    case "mostly-simple":
      return "playroom";
    case "mostly-imaginative":
      return "storybook";
    case "mix":
    default:
      return "playroom";
  }
}

/**
 * Soft default for session kidActivityStyle from durable preference.
 */
export function kidActivityStyleFromPreference(activityStylePreference) {
  switch (activityStylePreference) {
    case "mostly-simple":
      return "simple";
    case "mostly-imaginative":
      return "imaginative";
    case "mix":
    default:
      return null;
  }
}
