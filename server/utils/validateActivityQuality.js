/**
 * Authoritative quality gate — same philosophy for generation, ingest, and cache audit.
 */

import { validateActivityClarity } from "./activityClarityValidation.js";
import { validateActivityNarrative } from "./activityNarrativeValidation.js";
import { validateActivityForDisplay } from "./activityDisplayValidation.js";
import { evaluateActivityAgeFit } from "./activityAgePolicy.js";
import { isActivityFormatV4 } from "./activityFormat.js";

/**
 * @param {object} activity
 * @param {object} context
 * @param {{ mode?: "generation" | "cached" | "serve", activityMode?: string, childrenContext?: object[] }} options
 */
export function validateActivityQuality(activity, context = {}, options = {}) {
  const mode = options.mode || "generation";
  const checks = {};
  const errors = [];
  const warnings = [];
  const reasons = [];

  const clarity = validateActivityClarity(activity, context);
  checks.clarity = clarity;
  if (!clarity.valid) {
    errors.push(...clarity.errors);
  }
  warnings.push(...(clarity.warnings || []));

  const narrative = validateActivityNarrative(activity, context);
  checks.narrative = narrative;
  if (!narrative.skipped && !narrative.valid) {
    errors.push(...narrative.errors);
    reasons.push(...(narrative.reasons || []));
  }

  const display = validateActivityForDisplay(activity, { mode: mode === "generation" ? "generation" : "cached" });
  checks.display = display;
  if (!display.valid) {
    errors.push(...display.errors.map((code) => `display:${code}`));
  }

  if (Array.isArray(options.childrenContext) && options.childrenContext.length > 0) {
    const ageFit = evaluateActivityAgeFit({
      activity,
      childrenContext: options.childrenContext,
      activityMode: options.activityMode || "single-child",
    });
    checks.ageFit = ageFit;
    if (!ageFit.eligible) {
      errors.push(...(ageFit.reasons || []).map((reason) => `age:${reason}`));
      reasons.push(...(ageFit.reasons || []));
    }
  }

  const narrativeValidated =
    isActivityFormatV4(activity) && narrative.valid && !narrative.skipped;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    reasons: [...new Set(reasons)],
    checks,
    narrativeValidated,
  };
}
