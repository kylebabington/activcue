/**
 * Authoritative participant compatibility normalization for fit policy,
 * serve-time enrichment, and library ingest.
 *
 * Eligibility is primarily min/max range compatibility, not mode labels.
 */

const SOCIAL_MODE_RANGES = Object.freeze({
  solo: { min: 1, max: 1, participantMode: "single" },
  single: { min: 1, max: 1, participantMode: "single" },
  cooperative: { min: 2, max: 4, participantMode: "group" },
  competitive: { min: 2, max: 4, participantMode: "group" },
  flexible: { min: 1, max: 4, participantMode: "flexible" },
  group: { min: 2, max: 4, participantMode: "group" },
  family: { min: 2, max: 4, participantMode: "group" },
});

function readSocialMode(activity) {
  const raw =
    activity?.traits?.socialMode ||
    activity?.activity_data?.traits?.socialMode ||
    "";
  return String(raw).trim().toLowerCase();
}

function readRoleCount(activity) {
  const roles =
    activity?.roleGuide?.childRoles ||
    activity?.activity_data?.roleGuide?.childRoles ||
    [];
  return Array.isArray(roles) ? roles.length : 0;
}

function readExplicitFields(activity) {
  const mode = String(
    activity?.participant_mode || activity?.participantMode || ""
  )
    .trim()
    .toLowerCase();
  const min = Number(activity?.participant_min ?? activity?.participantMin ?? NaN);
  const max = Number(activity?.participant_max ?? activity?.participantMax ?? NaN);
  const validated =
    activity?.participant_fit_validated === true ||
    activity?.participantFitValidated === true;

  return {
    mode: mode || null,
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
    validated,
  };
}

function isExplicitRangeValid(min, max) {
  return (
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min >= 1 &&
    max >= min
  );
}

function rangeFromSocialMode(socialMode) {
  return SOCIAL_MODE_RANGES[socialMode] || null;
}

function deriveFromContent(activity) {
  const socialMode = readSocialMode(activity);
  const roleCount = readRoleCount(activity);
  const socialRange = rangeFromSocialMode(socialMode);

  let min = socialRange?.min ?? 1;
  let max = socialRange?.max ?? 1;
  let participantMode = socialRange?.participantMode ?? "single";

  if (roleCount >= 2) {
    min = Math.max(min, roleCount);
    max = Math.max(max, roleCount, 4);
    if (participantMode === "single") {
      participantMode = "group";
    }
  }

  if (roleCount >= 2) {
    max = Math.max(max, roleCount);
  }

  if (!socialRange && roleCount < 2) {
    participantMode = "single";
    min = 1;
    max = 1;
  }

  return {
    participantMode,
    min,
    max,
    socialMode: socialMode || (roleCount >= 2 ? "cooperative" : "solo"),
    roleCount,
    source: socialRange || roleCount >= 2 ? "content-derived" : "default",
  };
}

function explicitToRange(mode, min, max) {
  const socialRange = rangeFromSocialMode(mode);
  let resolvedMin = min;
  let resolvedMax = max;

  if (resolvedMin == null) {
    resolvedMin =
      socialRange?.min ?? (mode === "group" || mode === "family" ? 2 : 1);
  }
  if (resolvedMax == null) {
    resolvedMax =
      socialRange?.max ?? (mode === "group" || mode === "family" ? 4 : 1);
  }

  let participantMode = mode;
  if (mode === "group" || mode === "family") {
    participantMode = "group";
  } else if (mode === "flexible") {
    participantMode = "flexible";
  } else if (mode === "single" || mode === "solo") {
    participantMode = "single";
  } else if (socialRange) {
    participantMode = socialRange.participantMode;
  }

  return { participantMode, min: resolvedMin, max: resolvedMax };
}

function contentContradictsExplicit(explicit, derived, activity) {
  if (!isExplicitRangeValid(explicit.min, explicit.max)) {
    return true;
  }
  if (explicit.max === 1 && derived.max >= 2) {
    return true;
  }
  if (explicit.min === 1 && derived.min >= 2 && derived.roleCount >= 2) {
    return true;
  }
  const social = readSocialMode(activity);
  if (
    explicit.mode === "single" &&
    (social === "cooperative" || social === "competitive")
  ) {
    return true;
  }
  return false;
}

export function normalizeParticipantMeta(activity) {
  const explicit = readExplicitFields(activity);
  const derived = deriveFromContent(activity);
  const socialMode = readSocialMode(activity) || derived.socialMode;

  let participantMode;
  let min;
  let max;
  let source;
  let metadataContradiction = false;

  const explicitRange = explicitToRange(
    explicit.mode || "",
    explicit.min,
    explicit.max
  );

  if (
    explicit.validated &&
    explicit.mode &&
    isExplicitRangeValid(explicitRange.min, explicitRange.max) &&
    !contentContradictsExplicit(
      { ...explicit, min: explicitRange.min, max: explicitRange.max },
      derived,
      activity
    )
  ) {
    participantMode = explicitRange.participantMode;
    min = explicitRange.min;
    max = explicitRange.max;
    source = "validated-explicit";
  } else {
    if (
      explicit.mode &&
      isExplicitRangeValid(explicitRange.min, explicitRange.max)
    ) {
      metadataContradiction = contentContradictsExplicit(
        { ...explicit, min: explicitRange.min, max: explicitRange.max },
        derived,
        activity
      );
    }
    participantMode = derived.participantMode;
    min = derived.min;
    max = derived.max;
    source = derived.source;
  }

  if (derived.roleCount >= 2) {
    min = Math.max(min, derived.roleCount);
    max = Math.max(max, derived.roleCount);
    if (max < 2) max = 2;
  }

  if (!isExplicitRangeValid(min, max)) {
    min = 1;
    max = Math.max(1, derived.roleCount >= 2 ? derived.roleCount : 1);
    source = "default";
  }

  const participantFitValidated = source === "validated-explicit";

  return {
    participantMode,
    participantMin: min,
    participantMax: max,
    participant_mode: participantMode,
    participant_min: min,
    participant_max: max,
    socialMode,
    roleCount: derived.roleCount,
    source,
    metadataContradiction,
    participantFitValidated,
    participant_fit_validated: participantFitValidated,
  };
}

/**
 * Min/max-first participant compatibility check.
 */
export function evaluateParticipantCompatibility(
  meta,
  participantCount,
  textBlob = "",
  partnerRe = null
) {
  const failures = [];
  const count = Number(participantCount) || 0;
  const min = Number(
    meta?.min ?? meta?.participantMin ?? meta?.participant_min
  );
  const max = Number(
    meta?.max ?? meta?.participantMax ?? meta?.participant_max
  );
  const roleCount = Number(meta?.roleCount) || 0;
  const socialMode = String(meta?.socialMode || "").toLowerCase();

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    failures.push("participant-count-mismatch");
    return failures;
  }

  if (count < min || count > max) {
    failures.push("participant-count-mismatch");
  }

  if (count <= 1) {
    if (min > 1 && !failures.includes("participant-count-mismatch")) {
      failures.push("participant-count-mismatch");
    }
    if (roleCount >= 2) {
      failures.push("participant-count-mismatch");
    }
    if (partnerRe && partnerRe.test(textBlob)) {
      failures.push("participant-count-mismatch");
    }
  } else if (count >= 2) {
    if (max < 2) {
      failures.push("participant-count-mismatch");
    }
    if (
      max === 1 &&
      min === 1 &&
      roleCount < 2 &&
      (socialMode === "solo" || socialMode === "single" || socialMode === "")
    ) {
      failures.push("participant-count-mismatch");
    }
  }

  return [...new Set(failures)];
}

/** Legacy shape for fit policy consumers. */
export function toFitParticipantMeta(normalized) {
  return {
    mode: normalized.participantMode,
    min: normalized.participantMin,
    max: normalized.participantMax,
    roleCount: normalized.roleCount,
    socialMode: normalized.socialMode,
    source: normalized.source,
    metadataContradiction: normalized.metadataContradiction,
  };
}

/** Apply normalized participant fields onto an activity object. */
export function applyParticipantMeta(activity, normalized = null) {
  const meta = normalized || normalizeParticipantMeta(activity);
  return {
    ...activity,
    participantMode: meta.participantMode,
    participantMin: meta.participantMin,
    participantMax: meta.participantMax,
    participant_mode: meta.participant_mode,
    participant_min: meta.participant_min,
    participant_max: meta.participant_max,
    participantFitValidated: meta.participantFitValidated,
    participant_fit_validated: meta.participant_fit_validated,
  };
}
