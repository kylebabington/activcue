// src/constants/demoMoments.js

import { defaultParentStatusPresets } from "./presets";
import { formatAvailabilityLabel } from "../utils/activityFormatters";
import { presetToMomentDraft } from "../utils/momentPresets";

/**
 * Canonical landing /demo moments — same set as parent moment presets.
 * Moment field names match live scoring (activityScoring / sessionFitScore).
 */

function toMomentId(label) {
  const parts = String(label || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "moment";
  return (
    parts[0] +
    parts
      .slice(1)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("")
  );
}

function formatPresetDescription(preset) {
  return `${formatAvailabilityLabel(preset.availability)} · ${preset.timeNeededMinutes} min · ${preset.space}`;
}

function presetToDemoMoment(preset) {
  return {
    id: toMomentId(preset.label),
    label: preset.label,
    shortLabel: preset.label,
    description: formatPresetDescription(preset),
    moment: presetToMomentDraft(preset),
  };
}

const demoMomentEntries = defaultParentStatusPresets.map(presetToDemoMoment);

export const DEMO_MOMENTS = Object.freeze(
  Object.fromEntries(demoMomentEntries.map((moment) => [moment.id, moment]))
);

export const DEMO_MOMENT_LIST = Object.freeze(demoMomentEntries);

export const DEFAULT_DEMO_MOMENT_ID = DEMO_MOMENT_LIST[0]?.id || "cooking";

export function getDemoMoment(id) {
  return DEMO_MOMENTS[id] || DEMO_MOMENTS[DEFAULT_DEMO_MOMENT_ID];
}
