// src/features/activities/activityDemoService.js
// Demo / free-tier preset rotation and unlock helpers.

import {
  getEligiblePresets,
  takeRotatedOne,
  takeRotatedSlice,
} from "../../utils/presetDemo";

export function rotateDemoPresets({
  presets,
  style,
  rotationIndex,
  count = 3,
}) {
  const eligible = getEligiblePresets(presets, style);
  return takeRotatedSlice(eligible, rotationIndex?.[style] || 0, count);
}

export function nextDemoPreset({ presets, style, rotationIndex }) {
  const eligible = getEligiblePresets(presets, style);
  return takeRotatedOne(eligible, rotationIndex?.[style] || 0);
}

export function advanceRotationIndex(rotationIndex, style, step = 1) {
  const current = rotationIndex?.[style] || 0;
  return {
    ...rotationIndex,
    [style]: current + step,
  };
}

export { getEligiblePresets, takeRotatedOne, takeRotatedSlice };
