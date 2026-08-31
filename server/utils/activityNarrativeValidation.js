/**
 * Structural narrative quality validation for Activity Format V4 (imaginative only).
 * Does not prove semantic causality — that is enforced by prompt/schema and offline eval.
 */

import { textSimilarity } from "./activityClarityValidation.js";
import {
  isActivityFormatV4,
  isImaginativeActivity,
  hasQualityContractVersion,
} from "./activityFormat.js";
import { QUALITY_CONTRACT_VERSION } from "./activityFormatConstants.js";
import { UNDER10_OPENING_STORY } from "./narrativeStoryRequirements.js";

const GENERIC_STORY_PATTERNS = [
  /^some animals need help/i,
  /^a group of animals needs?/i,
  /^a mystery has appeared/i,
  /^the kingdom needs you/i,
  /^the kingdom desperately needs help/i,
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

const GENERIC_SCENE_FILLER_PATTERNS = [
  /^a new (problem|challenge|surprise) appears?\.?$/i,
  /^something else happens\.?$/i,
  /^the adventure continues\.?$/i,
  /^now it is time for the next (part|challenge|step)\.?$/i,
  /^you completed the scene\.?$/i,
  /^now move to the next challenge\.?$/i,
  /^a new surprise appears?\.?$/i,
  /^plot twist!?\.?$/i,
  /^the story changed\.?$/i,
];

const GENERIC_SCENE_SETUP_PATTERNS = [
  /^now (find|build|make|crawl|draw|search|collect)/i,
  /^you need to (build|find|make|crawl|draw)/i,
  /^(build|find|make|crawl|draw|search) /i,
];

const MIN_SCENE_FIELD_LENGTH = 30;

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

function validateQualityContract(activity, errors, reasons) {
  if (!hasQualityContractVersion(activity, QUALITY_CONTRACT_VERSION)) {
    pushReason(
      errors,
      reasons,
      "quality-contract-missing",
      `qualityContractVersion must be ${QUALITY_CONTRACT_VERSION}`
    );
  }
}

function validateOpeningStory(story, { oldestAge }, errors, reasons) {
  const under10 = isUnder10Band(oldestAge);
  const teen = isTeenBand(oldestAge);
  const sentences = countSentences(story);
  const words = countWords(story);

  if (under10) {
    if (
      sentences < UNDER10_OPENING_STORY.minSentences ||
      words < UNDER10_OPENING_STORY.minWords ||
      words > UNDER10_OPENING_STORY.maxWords
    ) {
      pushReason(
        errors,
        reasons,
        "story-too-thin",
        `story must be ${UNDER10_OPENING_STORY.targetSentences} sentences (~${UNDER10_OPENING_STORY.targetWords} words) for under-10; got ${sentences} sentences, ${words} words`
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

  if (under10 && sentences <= 1) {
    pushReason(
      errors,
      reasons,
      "story-missing-problem",
      "story is a single sentence — must establish setting, event, problem, stakes, and goal"
    );
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
}

function validateSceneFields(stepDetails, errors, reasons) {
  (stepDetails || []).forEach((step, index) => {
    const sceneSetup = asString(step?.sceneSetup);
    const sceneOutcome = asString(step?.sceneOutcome);

    if (!sceneSetup || sceneSetup.length < MIN_SCENE_FIELD_LENGTH) {
      pushReason(
        errors,
        reasons,
        "scene-setup-missing",
        `stepDetails[${index}].sceneSetup is missing or too thin`
      );
    }

    if (!sceneOutcome || sceneOutcome.length < MIN_SCENE_FIELD_LENGTH) {
      pushReason(
        errors,
        reasons,
        "scene-outcome-missing",
        `stepDetails[${index}].sceneOutcome is missing or too thin`
      );
    }

    for (const pattern of GENERIC_SCENE_FILLER_PATTERNS) {
      if (pattern.test(sceneOutcome)) {
        pushReason(
          errors,
          reasons,
          "scene-outcome-generic",
          `stepDetails[${index}].sceneOutcome uses generic filler: "${sceneOutcome}"`
        );
        break;
      }
      if (pattern.test(sceneSetup)) {
        pushReason(
          errors,
          reasons,
          "scene-setup-generic",
          `stepDetails[${index}].sceneSetup uses generic filler: "${sceneSetup}"`
        );
        break;
      }
    }

    if (sceneSetup.length < MIN_SCENE_FIELD_LENGTH + 10) {
      for (const pattern of GENERIC_SCENE_SETUP_PATTERNS) {
        if (pattern.test(sceneSetup)) {
          pushReason(
            errors,
            reasons,
            "scene-setup-command-only",
            `stepDetails[${index}].sceneSetup reads as a command, not a story reason: "${sceneSetup}"`
          );
          break;
        }
      }
    }

    const actions = Array.isArray(step?.actions) ? step.actions : [];
    if (actions.length === 0) {
      pushReason(
        errors,
        reasons,
        "scene-actions-missing",
        `stepDetails[${index}].actions must contain at least one action`
      );
    }
  });
}

function validateFinishGuideOwnership(finishGuide, errors, reasons) {
  const resolution = asString(finishGuide?.resolution);
  const action = asString(finishGuide?.action);
  const doneWhen = asString(finishGuide?.doneWhen);

  if (!resolution || resolution.length < 20) {
    pushReason(
      errors,
      reasons,
      "story-resolution-missing",
      "finishGuide.resolution must explain how the opening problem was resolved (≥20 chars)"
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

  if (!action) {
    pushReason(errors, reasons, "finish-action-missing", "finishGuide.action is required");
  }

  if (!doneWhen) {
    pushReason(errors, reasons, "finish-done-when-missing", "finishGuide.doneWhen is required");
  }

  const pairs = [
    ["resolution", resolution, "action", action],
    ["resolution", resolution, "doneWhen", doneWhen],
    ["action", action, "doneWhen", doneWhen],
  ];

  for (const [labelA, textA, labelB, textB] of pairs) {
    if (!textA || !textB) continue;
    const similarity = textSimilarity(textA, textB);
    if (similarity >= 0.75) {
      pushReason(
        errors,
        reasons,
        "finish-fields-duplicated",
        `finishGuide.${labelA} and finishGuide.${labelB} are too similar — each field must own a distinct purpose`
      );
    }
  }
}

function collectMultiChildRoleWarnings(story, roleGuide, participantCount) {
  const warnings = [];
  if (participantCount < 2) return warnings;

  const childRoles = Array.isArray(roleGuide?.childRoles) ? roleGuide.childRoles : [];
  if (childRoles.length < 2) return warnings;

  const storyLower = story.toLowerCase();
  const missingRoles = childRoles
    .map((role) => asString(role?.roleTitle))
    .filter((title) => title.length >= 3)
    .filter((title) => !storyLower.includes(title.toLowerCase()));

  if (missingRoles.length > 0) {
    warnings.push({
      code: "story-roles-missing",
      detail: `opening story does not mention role titles verbatim: ${missingRoles.join(", ")}`,
    });
  }
  return warnings;
}

/**
 * @param {object} activity
 * @param {{ youngestAge?: number|null, oldestAge?: number|null, participantCount?: number }} context
 * @returns {{ valid: boolean, errors: string[], reasons: string[], warnings?: Array<{code: string, detail: string}>, skipped?: boolean }}
 */
export function validateActivityNarrative(activity, context = {}) {
  const errors = [];
  const reasons = [];
  const warnings = [];

  if (!activity || typeof activity !== "object") {
    return { valid: false, errors: ["activity is required"], reasons: ["story-too-thin"] };
  }

  if (!isActivityFormatV4(activity)) {
    return { valid: true, errors: [], reasons: [], skipped: true };
  }

  if (!isImaginativeActivity(activity)) {
    pushReason(
      errors,
      reasons,
      "v4-style-mismatch",
      "Activity Format V4 is imaginative-only — activityStyle must be imaginative"
    );
    return { valid: false, errors, reasons: [...new Set(reasons)] };
  }

  validateQualityContract(activity, errors, reasons);

  const oldestAge = Number.isFinite(Number(context.oldestAge))
    ? Number(context.oldestAge)
    : null;
  const participantCount = Number.isFinite(Number(context.participantCount))
    ? Number(context.participantCount)
    : 1;

  const story = asString(activity.story);
  validateOpeningStory(story, { oldestAge }, errors, reasons);
  validateSceneFields(activity.stepDetails, errors, reasons);
  validateFinishGuideOwnership(activity.finishGuide, errors, reasons);
  warnings.push(
    ...collectMultiChildRoleWarnings(story, activity.roleGuide, participantCount)
  );

  return {
    valid: errors.length === 0,
    errors,
    reasons: [...new Set(reasons)],
    warnings,
  };
}

export function formatNarrativeSteerHints(reasons = []) {
  const hints = [];
  const unique = [...new Set(reasons)];

  if (unique.includes("story-too-thin")) {
    hints.push(
      `Write a ${UNDER10_OPENING_STORY.targetSentences} sentence opening story (~${UNDER10_OPENING_STORY.targetWords} words for under-10) with WHERE, WHAT happened before play, the current PROBLEM, WHY it matters, and WHY the child/children are needed.`
    );
  }
  if (unique.includes("story-missing-problem")) {
    hints.push(
      "Replace generic openings with a specific inciting event tied to this activity's objects."
    );
  }
  if (
    unique.includes("scene-setup-missing") ||
    unique.includes("scene-setup-generic") ||
    unique.includes("scene-setup-command-only")
  ) {
    hints.push(
      "Every scene needs sceneSetup: what changed and WHY action is necessary now. Do not write commands or generic filler."
    );
  }
  if (
    unique.includes("scene-outcome-missing") ||
    unique.includes("scene-outcome-generic")
  ) {
    hints.push(
      "Every scene needs sceneOutcome: what changed because the child succeeded. The next scene must exist because of this outcome."
    );
  }
  if (unique.includes("story-resolution-missing") || unique.includes("finish-fields-duplicated")) {
    hints.push(
      "finishGuide.resolution = how the opening problem was resolved (narrative). finishGuide.action = what the child does (physical). finishGuide.doneWhen = observable result. Do not repeat the same text."
    );
  }
  if (
    unique.some((code) =>
      [
        "scene-setup-generic",
        "scene-outcome-generic",
        "scene-setup-command-only",
        "story-missing-problem",
      ].includes(code)
    )
  ) {
    hints.push(
      "CAUSALITY RETRY: Rebuild the scene sequence. Each scene must follow problem/change → necessary action → consequence. Do NOT add descriptive language to themed tasks — change the actions if they do not belong in the story."
    );
  }

  return hints;
}
