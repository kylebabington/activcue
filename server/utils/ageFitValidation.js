// server/utils/ageFitValidation.js

import {
  getGroupAgeContext,
  isEligibleForChildren,
  validateAgeFit,
} from "./childAge.js";

const BABYSITTER_PATTERN =
  /\b(supervise|babysit|watch(ing)? the (younger|little)|manage (the )?younger|help(ing)? (the )?younger|look after|take care of (the )?younger)\b/i;

/**
 * Themes/language that feel young-child even when ageFit.maxAge is stretched.
 * Applied when the oldest participant is 12+.
 */
const YOUNG_CHILD_CONTENT_PATTERNS = [
  /\bblanket\s+fort\b/i,
  /\bpillow\s+fort\b/i,
  /\bcushion\s+fort\b/i,
  /\bcozy\s+fort\b/i,
  /\b(build|make|create)\s+a\s+cozy\s+fort\b/i,
  /\b(blanket|pillow|cushion|cozy)\s+(cave|den|hideout|nook)\b/i,
  /\bblanket\s+cave\b/i,
  /\bpillow\s+cave\b/i,
  /\bmagical\s+(blanket|pillow|castle|fort|kingdom)\b/i,
  /\b(build|make|create)\s+a\s+(magical\s+)?(blanket\s+)?castle\b/i,
  /\bteddy(\s+bear)?\s+(tea|picnic|party)\b/i,
  /\btea\s+party\b/i,
  /\bstuffed\s+animal\b/i,
  /\bbaby\s+doll\b/i,
  /\bplay\s+kitchen\b/i,
  /\bnursery\b/i,
  /\bcuddle\s+(fort|pile|time)\b/i,
  /\bfairy\s+(tea|garden|castle|dust)\b/i,
  /\bprincess\s+(castle|tea|dress[- ]?up)\b/i,
  /\bdress[- ]?up\s+(party|time|clothes)\b/i,
  /\bpretend\s+you\s+are\s+(a\s+)?(baby|fairy|princess|teddy|superhero|wizard)\b/i,
  /\bmake[- ]?believe\s+(world|kingdom|adventure)\b/i,
];

/** Extra pretend-story framing that feels too young for teens (13+). */
const TEEN_PRETEND_STORY_PATTERNS = [
  /\byou\s+are\s+(a\s+)?(brave\s+)?(hero|knight|wizard|fairy|princess|space\s+cadet|pirate\s+captain)\b/i,
  /\bmagical\s+(quest|kingdom|adventure|mission)\b/i,
  /\bpretend\s+(play|world|adventure)\b/i,
  /\bonce\s+upon\s+a\s+time\b/i,
  /\byour\s+(magical|enchanted)\s+(powers|wand|castle)\b/i,
];

const AGE_APPROPRIATE_FORT_EXCEPTION =
  /\b(movie\s+lounge|media\s+nook|design\s+(a\s+)?(lounge|studio|space)|interior\s+design|cozy\s+screening)\b/i;

function collectActivityText(activity) {
  const parts = [
    activity?.title,
    activity?.summary,
    activity?.theme,
    activity?.mission,
    activity?.kidRole,
    activity?.ageFit?.ageFitReason,
    activity?.roleGuide?.name,
    activity?.roleGuide?.description,
    activity?.roleGuide?.goal,
    activity?.roleGuide?.firstAction,
  ];

  for (const idea of Array.isArray(activity?.starterIdeas)
    ? activity.starterIdeas
    : []) {
    parts.push(idea?.title, idea?.example);
  }

  for (const step of Array.isArray(activity?.stepDetails)
    ? activity.stepDetails
    : []) {
    parts.push(step?.title, step?.instruction, step?.doneWhen, step?.ifStuck);
    if (Array.isArray(step?.examples)) {
      parts.push(...step.examples);
    }
  }

  for (const prompt of Array.isArray(activity?.starterPrompts)
    ? activity.starterPrompts
    : []) {
    parts.push(prompt);
  }

  return parts.filter((part) => typeof part === "string" && part.trim()).join("\n");
}

/**
 * Reject infantilizing maturity labels / young-child content for older kids.
 * ageFit ranges alone are not enough — models often set maxAge high for forts.
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateAgeContentFit(activity, childrenContext = []) {
  const reasons = [];
  const ages = (Array.isArray(childrenContext) ? childrenContext : [])
    .map((child) => Number(child.ageYears))
    .filter((age) => Number.isFinite(age));

  if (ages.length === 0) {
    return { ok: true, reasons };
  }

  const oldest = Math.max(...ages);
  const maturity = String(activity?.ageFit?.maturityLevel || "").trim();
  const text = collectActivityText(activity);

  if (oldest >= 13) {
    if (maturity === "young-child" || maturity === "child") {
      reasons.push("maturity-too-young");
    }
  } else if (oldest >= 12 && maturity === "young-child") {
    reasons.push("maturity-too-young");
  }

  if (oldest >= 12) {
    const hitsYoungContent = YOUNG_CHILD_CONTENT_PATTERNS.some((pattern) =>
      pattern.test(text)
    );
    const hasAgeAppropriateFrame = AGE_APPROPRIATE_FORT_EXCEPTION.test(text);

    if (hitsYoungContent && !hasAgeAppropriateFrame) {
      reasons.push("young-child-content-for-older");
    }
  }

  if (oldest >= 13) {
    const hitsPretendStory = TEEN_PRETEND_STORY_PATTERNS.some((pattern) =>
      pattern.test(text)
    );
    if (hitsPretendStory) {
      reasons.push("teen-pretend-story");
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Heuristic mixed-age role quality checks.
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateMixedAgeRoles(activity, childrenContext = []) {
  const reasons = [];
  const children = Array.isArray(childrenContext) ? childrenContext : [];
  const ages = children.map((child) => child.ageYears);
  const group = getGroupAgeContext(ages);

  if (!group.isMixedAge || children.length < 2) {
    return { ok: true, reasons };
  }

  const childRoles = Array.isArray(activity?.roleGuide?.childRoles)
    ? activity.roleGuide.childRoles
    : [];

  if (childRoles.length === 0) {
    reasons.push("missing-child-roles");
  }

  for (const child of children) {
    const name = String(child.name || "").trim().toLowerCase();
    if (!name) continue;
    const match = childRoles.find(
      (role) =>
        String(role?.childName || "")
          .trim()
          .toLowerCase() === name
    );
    if (!match) {
      reasons.push(`missing-role-for:${child.name}`);
    }
  }

  const oldest = children.reduce((best, child) => {
    if (!best || child.ageYears > best.ageYears) return child;
    return best;
  }, null);

  if (oldest) {
    const oldestRole = childRoles.find(
      (role) =>
        String(role?.childName || "")
          .trim()
          .toLowerCase() === String(oldest.name || "").trim().toLowerCase()
    );
    const roleText = [
      oldestRole?.roleTitle,
      oldestRole?.responsibility,
      oldestRole?.firstAction,
    ]
      .filter(Boolean)
      .join(" ");

    if (roleText && BABYSITTER_PATTERN.test(roleText)) {
      reasons.push("oldest-as-babysitter");
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Full post-generation age validation for one activity.
 */
export function evaluateActivityAgeQuality(activity, childrenContext = []) {
  const ages = (Array.isArray(childrenContext) ? childrenContext : []).map(
    (child) => child.ageYears
  );
  const ageFitOk = validateAgeFit(activity, ages);
  const mixed = validateMixedAgeRoles(activity, childrenContext);
  const content = validateAgeContentFit(activity, childrenContext);

  return {
    ok: ageFitOk && mixed.ok && content.ok,
    ageFitOk,
    mixedAgeOk: mixed.ok,
    contentOk: content.ok,
    reasons: [
      ...(ageFitOk ? [] : ["age-fit-range"]),
      ...mixed.reasons,
      ...content.reasons,
    ],
  };
}

/**
 * Filter a batch; log failures. Prefer dropping bad items over surfacing them.
 */
export function filterActivitiesByAgeFit(activities, childrenContext = []) {
  const list = Array.isArray(activities) ? activities : [];
  const kept = [];
  let rejectedCount = 0;
  const rejectionDetails = [];

  for (const activity of list) {
    const evaluation = evaluateActivityAgeQuality(activity, childrenContext);
    if (evaluation.ok) {
      kept.push(activity);
    } else {
      rejectedCount += 1;
      rejectionDetails.push({
        title: activity?.title || "(untitled)",
        reasons: evaluation.reasons,
      });
    }
  }

  if (rejectedCount > 0) {
    console.warn("[ageFit] rejected activities", {
      rejectedCount,
      keptCount: kept.length,
      details: rejectionDetails,
    });
  }

  return {
    activities: kept,
    rejectedCount,
    rejectionDetails,
  };
}

export { isEligibleForChildren, validateAgeFit };
