/**
 * @deprecated Use validateActivityNarrative for V4 and validateActivityQuality orchestrator.
 * Thin compatibility shim — V4 delegates to activityNarrativeValidation; V3 keeps storyBeat checks.
 */

import { textSimilarity } from "./activityClarityValidation.js";
import {
  validateActivityNarrative,
  formatNarrativeSteerHints,
} from "./activityNarrativeValidation.js";
import { isActivityFormatV4 } from "./activityFormat.js";

export function formatStoryQualitySteerHints(reasons = []) {
  const hints = formatNarrativeSteerHints(reasons);
  const unique = [...new Set(reasons)];
  if (unique.includes("story-beat-missing")) {
    hints.push(
      "Every stepDetails[] scene needs storyBeat: 1–2 sentences describing what NEW event or obstacle happens now and why this scene's actions matter."
    );
  }
  if (unique.includes("story-beat-repeated")) {
    hints.push(
      "Each storyBeat must introduce a different story change — do not repeat the same obstacle across scenes."
    );
  }
  return hints;
}

const GENERIC_STORY_PATTERNS = [
  /^some animals need help/i,
  /^a group of animals needs?/i,
  /^a mystery has appeared/i,
  /^the kingdom needs you/i,
  /^the rescue team is coming/i,
  /^your mission is to save the day/i,
  /^a group of .* needs? .* before the rescue team arrives/i,
];

const GENERIC_RESOLUTION_PATTERNS = [
  /^do one last check/i,
  /^tell someone what you made/i,
  /^clean up when you are done/i,
  /^celebrate completing the activity/i,
];

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function countSentences(text) {
  const trimmed = asString(text);
  if (!trimmed) return 0;
  return trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
}

function countWords(text) {
  return asString(text).split(/\s+/).filter(Boolean).length;
}

function isUnder10Band(oldestAge) {
  if (!Number.isFinite(oldestAge)) return true;
  return oldestAge < 10;
}

function isTeenBand(oldestAge) {
  return Number.isFinite(oldestAge) && oldestAge >= 13;
}

function pushReason(errors, reasons, code, detail) {
  errors.push(detail);
  if (!reasons.includes(code)) {
    reasons.push(code);
  }
}

function validateImaginativeStoryQualityV3(activity, context = {}) {
  const errors = [];
  const reasons = [];

  if (!activity || typeof activity !== "object") {
    return { valid: false, errors: ["activity is required"], reasons: ["story-too-thin"] };
  }

  if (Number(activity.activityFormatVersion) !== 3) {
    return { valid: true, errors: [], reasons: [] };
  }

  if (activity.activityStyle === "simple") {
    return { valid: true, errors: [], reasons: [] };
  }

  const oldestAge = Number.isFinite(Number(context.oldestAge))
    ? Number(context.oldestAge)
    : null;
  const participantCount = Number.isFinite(Number(context.participantCount))
    ? Number(context.participantCount)
    : 1;

  const story = asString(activity.story);
  const under10 = isUnder10Band(oldestAge);
  const teen = isTeenBand(oldestAge);
  const sentences = countSentences(story);
  const words = countWords(story);

  if (under10) {
    if (sentences < 4 || words < 70 || words > 120) {
      pushReason(
        errors,
        reasons,
        "story-too-thin",
        `story must be 4–6 sentences (~70–120 words) for under-10; got ${sentences} sentences, ${words} words`
      );
    }
  } else if (teen || oldestAge >= 10) {
    if (sentences < 2 || words < 40) {
      pushReason(
        errors,
        reasons,
        "story-too-thin",
        `story must be at least 2 sentences (~40+ words) for ages 10+; got ${sentences} sentences, ${words} words`
      );
    }
  }

  for (const pattern of GENERIC_STORY_PATTERNS) {
    if (pattern.test(story)) {
      pushReason(
        errors,
        reasons,
        "story-missing-problem",
        "story uses a generic opening instead of a specific inciting situation"
      );
      break;
    }
  }

  const beats = [];
  (activity.stepDetails || []).forEach((step, index) => {
    const beat = asString(step?.storyBeat);
    if (!beat || beat.length < 12) {
      pushReason(
        errors,
        reasons,
        "story-beat-missing",
        `stepDetails[${index}].storyBeat is missing or too thin`
      );
      return;
    }
    beats.push({ index, beat });
  });

  for (let i = 0; i < beats.length; i += 1) {
    for (let j = i + 1; j < beats.length; j += 1) {
      const similarity = textSimilarity(beats[i].beat, beats[j].beat);
      if (similarity >= 0.65) {
        pushReason(
          errors,
          reasons,
          "story-beat-repeated",
          `stepDetails[${beats[i].index}] and stepDetails[${beats[j].index}] storyBeat are too similar`
        );
      }
    }
  }

  const resolution = asString(activity.finishGuide?.resolution);
  if (!resolution || resolution.length < 20) {
    pushReason(
      errors,
      reasons,
      "story-resolution-missing",
      "finishGuide.resolution must show how the opening problem is resolved (≥20 chars)"
    );
  } else {
    for (const pattern of GENERIC_RESOLUTION_PATTERNS) {
      if (pattern.test(resolution)) {
        pushReason(
          errors,
          reasons,
          "story-resolution-missing",
          "finishGuide.resolution is a generic ending, not a story payoff"
        );
        break;
      }
    }
  }

  if (participantCount >= 2) {
    const childRoles = Array.isArray(activity.roleGuide?.childRoles)
      ? activity.roleGuide.childRoles
      : [];
    const storyLower = story.toLowerCase();
    const missingRoles = childRoles
      .map((role) => asString(role?.roleTitle))
      .filter((title) => title.length >= 3)
      .filter((title) => !storyLower.includes(title.toLowerCase()));
    if (missingRoles.length > 0) {
      pushReason(
        errors,
        reasons,
        "story-roles-missing",
        `opening story must introduce role titles: ${missingRoles.join(", ")}`
      );
    }
  }

  return { valid: errors.length === 0, errors, reasons: [...new Set(reasons)] };
}

export function validateImaginativeStoryQuality(activity, context = {}) {
  if (isActivityFormatV4(activity)) {
    return validateActivityNarrative(activity, context);
  }
  return validateImaginativeStoryQualityV3(activity, context);
}
