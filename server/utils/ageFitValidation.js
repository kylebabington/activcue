// server/utils/ageFitValidation.js

import {
  getGroupAgeContext,
  isEligibleForChildren,
  validateAgeFit,
} from "./childAge.js";

const BABYSITTER_PATTERN =
  /\b(supervise|babysit|watch(ing)? the (younger|little)|manage (the )?younger|help(ing)? (the )?younger|look after|take care of (the )?younger)\b/i;

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

  return {
    ok: ageFitOk && mixed.ok,
    ageFitOk,
    mixedAgeOk: mixed.ok,
    reasons: [
      ...(ageFitOk ? [] : ["age-fit-range"]),
      ...mixed.reasons,
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
