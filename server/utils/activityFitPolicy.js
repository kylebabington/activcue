// server/utils/activityFitPolicy.js
// Central hard-requirement gate for every recommendation source.

import { evaluateActivityAgeFit } from "./activityAgePolicy.js";
import { validateActivityClarity } from "./activityClarityValidation.js";
import {
  normalizeParticipantMeta,
  evaluateParticipantCompatibility,
  toFitParticipantMeta,
} from "./participantMeta.js";

export const FIT_POLICY_VERSION = 1;

const MESS_RANK = Object.freeze({ none: 0, low: 1, medium: 2, high: 3 });
const OUTDOOR_SPACE_RE =
  /\b(yard|garden|park|playground|driveway|sidewalk|outside|outdoor|patio|backyard)\b/i;
const INDOOR_SPACE_RE =
  /\b(bedroom|living room|kitchen|table|indoors?|indoor|couch|sofa|hallway)\b/i;
const OUTDOOR_ACTIVITY_RE =
  /\b(outdoors?|outside|yard|garden|park|playground|sidewalk|nature walk|scavenger hunt outside)\b/i;
const INDOOR_ONLY_ACTIVITY_RE =
  /\b(bedroom|under the table|couch fort|kitchen table|living room only)\b/i;
const WATER_RE = /\b(water|sink|bath|pool|splash|hose|puddle|washing)\b/i;
const FOOD_RE =
  /\b(food|snack|cook|bake|recipe|kitchen ingredients|eat|taste|mixing bowl of food)\b/i;
const SCREEN_RE =
  /\b(screen|tablet|phone|ipad|youtube|video game|tv|app|computer|chromebook)\b/i;
const SMALL_OBJECT_RE =
  /\b(bead|marble|coin|button|pin|thumbtack|small parts|choking)\b/i;
const LOUD_RE =
  /\b(loud|shout|yell|scream|stomping|drum|noisy|high[- ]energy chase)\b/i;
const PARTNER_RE =
  /\b(partner|sibling|take turns with|one person .+ while (the )?other|two children|both kids|team up|your brother|your sister)\b/i;

export { PARTNER_RE };

function textBlob(activity) {
  const parts = [
    activity?.title,
    activity?.summary,
    activity?.theme,
    activity?.story,
    activity?.mission,
    activity?.energy,
    activity?.mess,
    activity?.adultHelp,
    ...(Array.isArray(activity?.uses) ? activity.uses : []),
    ...(Array.isArray(activity?.categories) ? activity.categories : []),
    ...(Array.isArray(activity?.steps) ? activity.steps : []),
    ...(Array.isArray(activity?.stepDetails)
      ? activity.stepDetails.flatMap((step) => [
          step?.title,
          step?.instruction,
          step?.doneWhen,
        ])
      : []),
  ];
  return parts.filter(Boolean).join(" ");
}

function buildParticipantDiagnostics(activity, normalized) {
  return {
    participantMode: normalized.participantMode,
    participantMin: normalized.participantMin,
    participantMax: normalized.participantMax,
    roleCount: normalized.roleCount,
    socialMode: normalized.socialMode,
    source: normalized.source,
    metadataContradiction: normalized.metadataContradiction,
    title: activity?.title || null,
  };
}

function inventoryRequirementFailures(activity, inventory = []) {
  const available = new Set(
    (Array.isArray(inventory) ? inventory : [])
      .map((item) =>
        String(item?.name || item?.label || item || "")
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  );

  const required = [];
  if (Array.isArray(activity?.requiredSupplies)) {
    required.push(...activity.requiredSupplies);
  }
  if (Array.isArray(activity?.uses)) {
    // Soft uses are not hard requirements unless marked required.
    const hardUses = activity.uses.filter((item) => {
      if (item && typeof item === "object") {
        return item.required === true || item.essential === true;
      }
      return false;
    });
    required.push(...hardUses);
  }

  const missing = required
    .map((item) =>
      String(item?.name || item?.label || item || "")
        .trim()
        .toLowerCase()
    )
    .filter((name) => name && !available.has(name));

  return missing.length > 0 ? ["inventory-missing"] : [];
}

/**
 * Evaluate whether an activity may be served for this request.
 */
export function evaluateActivityFit(activity, requestContext = {}) {
  const hardFailures = [];
  const scores = {
    ageTarget: 0,
    inventory: 0,
    interests: 0,
  };

  const participants = requestContext?.participants || {};
  const participantCount = Number(
    participants.participantCount ??
      (Array.isArray(participants.children) ? participants.children.length : 0)
  );
  const mode =
    participants.mode ||
    (participantCount >= 2 ? "family" : "single-child");
  const childrenContext =
    participants.childrenContext ||
    participants.children ||
    requestContext.childrenContext ||
    [];
  const moment = requestContext.moment || {};
  const safety = requestContext.safety || {};
  const activityPrefs = requestContext.activity || {};
  const expectedStyle =
    activityPrefs.style || requestContext.expectedStyle || null;
  const inventory = requestContext.inventory || [];

  // --- Participants (min/max-first) ---
  const normalizedParticipant = normalizeParticipantMeta(activity);
  const participantMeta = toFitParticipantMeta(normalizedParticipant);
  const blob = textBlob(activity);
  const participantFailures = evaluateParticipantCompatibility(
    participantMeta,
    participantCount,
    blob,
    PARTNER_RE
  );
  hardFailures.push(...participantFailures);

  // --- Age (delegates to activityAgePolicy) ---
  const ageEval = evaluateActivityAgeFit({
    activity,
    childrenContext,
    activityMode: mode,
    expectedStyle,
  });
  scores.ageTarget = ageEval.score || 0;
  if (!ageEval.eligible) {
    for (const reason of ageEval.reasons || []) {
      if (reason === "wrong-style") {
        hardFailures.push("style-mismatch");
      } else if (reason === "mixed-age-only") {
        hardFailures.push("mixed-age-only");
      } else if (!hardFailures.includes(reason) && reason !== "style-mismatch") {
        hardFailures.push(reason === "age-range-mismatch" ? "age-range-mismatch" : reason);
      }
    }
    if (!ageEval.reasons?.length) {
      hardFailures.push("age-range-mismatch");
    }
  }

  // --- Style exact ---
  if (expectedStyle) {
    const style = String(activity?.activityStyle || activity?.style || "").trim();
    if (style && style !== expectedStyle && !hardFailures.includes("style-mismatch")) {
      hardFailures.push("style-mismatch");
    }
  }

  // --- Time (no +5 soft tolerance) ---
  const maxMinutes = Number(
    safety.maxActivityMinutes ?? moment.timeNeededMinutes ?? NaN
  );
  const estimated = Number(activity?.estimatedMinutes ?? activity?.estimated_minutes);
  if (Number.isFinite(maxMinutes) && Number.isFinite(estimated) && estimated > maxMinutes) {
    hardFailures.push("time-limit");
  }

  // --- Mess ---
  const messLimit = String(moment.messLevel || safety.messLevel || "medium").toLowerCase();
  const activityMess = String(activity?.mess || "low").toLowerCase();
  if ((MESS_RANK[activityMess] ?? 2) > (MESS_RANK[messLimit] ?? 2)) {
    hardFailures.push("mess-limit");
  }

  // --- Noise / energy ---
  const quiet =
    safety.quietMode === true ||
    moment.noiseLevel === "quiet" ||
    activityPrefs.energyLevel === "quiet";
  if (quiet) {
    const energy = String(activity?.energy || "").toLowerCase();
    if (energy === "high" || energy === "loud" || LOUD_RE.test(textBlob(activity))) {
      hardFailures.push("noise-limit");
    }
  }

  // --- Supervision ---
  const supervision =
    moment.supervisionLevel ||
    safety.adultHelpAllowed ||
    "";
  const adultHelp = String(activity?.adultHelp || "optional").toLowerCase();
  if (
    (supervision === "independent" || safety.adultHelpAllowed === "independent") &&
    (adultHelp === "required" || adultHelp === "needed" || adultHelp === "hands-on")
  ) {
    hardFailures.push("supervision-mismatch");
  }

  // --- Space ---
  const space = String(moment.space || "");
  if (space && INDOOR_SPACE_RE.test(space) && OUTDOOR_ACTIVITY_RE.test(blob)) {
    hardFailures.push("space-mismatch");
  }
  if (space && OUTDOOR_SPACE_RE.test(space) && INDOOR_ONLY_ACTIVITY_RE.test(blob)) {
    hardFailures.push("space-mismatch");
  }

  // --- Safety ---
  if (safety.screenFreeOnly !== false && SCREEN_RE.test(blob)) {
    hardFailures.push("screen-free");
  }
  if (safety.noFoodActivities === true && FOOD_RE.test(blob)) {
    hardFailures.push("no-food");
  }
  if (safety.noWaterPlay === true && WATER_RE.test(blob)) {
    hardFailures.push("no-water");
  }
  if (safety.noSmallObjects === true && SMALL_OBJECT_RE.test(blob)) {
    hardFailures.push("no-small-objects");
  }

  // --- Inventory ---
  const inventoryFailures = inventoryRequirementFailures(activity, inventory);
  hardFailures.push(...inventoryFailures);
  if (inventoryFailures.length === 0) {
    scores.inventory = 4;
  }

  // --- Clarity ---
  const clarity = validateActivityClarity(activity);
  if (!clarity.valid) {
    hardFailures.push("clarity-failed");
  }

  // Soft interest score
  const interestSet = new Set(
    (Array.isArray(participants.children) ? participants.children : [])
      .flatMap((child) =>
        Array.isArray(child?.interests) ? child.interests : []
      )
      .map((item) => String(item).toLowerCase())
  );
  if (interestSet.size > 0) {
    const hits = [...interestSet].filter((interest) =>
      blob.toLowerCase().includes(interest)
    ).length;
    scores.interests = hits;
  }

  const uniqueFailures = [...new Set(hardFailures)];
  return {
    eligible: uniqueFailures.length === 0,
    hardFailures: uniqueFailures,
    scores,
    fitPolicyVersion: FIT_POLICY_VERSION,
    participantDiagnostics: buildParticipantDiagnostics(
      activity,
      normalizedParticipant
    ),
    ageWarnings: ageEval.warnings || [],
  };
}

export function filterActivitiesByFitPolicy(activities, requestContext) {
  const examined = Array.isArray(activities) ? activities : [];
  const rejectedByReason = {};
  const eligible = [];
  const rejected = [];

  for (const activity of examined) {
    const result = evaluateActivityFit(activity, requestContext);
    if (result.eligible) {
      eligible.push({ activity, result });
    } else {
      rejected.push({ activity, result });
      for (const reason of result.hardFailures) {
        rejectedByReason[reason] = (rejectedByReason[reason] || 0) + 1;
      }
    }
  }

  return {
    activities: eligible.map((item) => item.activity),
    eligible,
    rejected,
    summary: {
      examined: examined.length,
      eligible: eligible.length,
      rejected: rejected.length,
      rejectedByReason,
    },
  };
}

export function buildFitRequestContextFromParts({
  participants,
  moment = {},
  safety = {},
  activity = {},
  inventory = [],
  childrenContext = null,
} = {}) {
  return {
    participants: {
      ...(participants || {}),
      childrenContext:
        childrenContext ||
        participants?.childrenContext ||
        participants?.children ||
        [],
    },
    moment,
    safety,
    activity,
    inventory,
  };
}

/**
 * Infer participant metadata for cache columns from activity structure.
 */
export function inferParticipantMetadata(activity) {
  const normalized = normalizeParticipantMeta(activity);
  return {
    participant_mode: normalized.participant_mode,
    participant_min: normalized.participant_min,
    participant_max: normalized.participant_max,
    participant_fit_validated: true,
  };
}
