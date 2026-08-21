// server/utils/sanitizedGenerationContext.js
// Privacy-safe telemetry snapshot for recommendation batches (no names/PII).

import {
  AGE_POLICY_VERSION,
  getPolicyAgeBand,
} from "./activityAgePolicy.js";
import { FIT_POLICY_VERSION } from "./activityFitPolicy.js";

/**
 * Build a sanitized generation_context object for telemetry.
 * Never includes child names, ids, or free-text notes.
 */
export function buildSanitizedGenerationContext({
  requestContext = null,
  participants = null,
  activityStyle = null,
  energyLevel = null,
  sourcePath = null,
  requestId = null,
  extra = {},
} = {}) {
  const ages = (
    participants?.ages ||
    requestContext?.participants?.ages ||
    []
  )
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age));

  const moment = requestContext?.moment || {};
  const activity = requestContext?.activity || {};
  const safety = requestContext?.safety || {};

  const participantCount = Number(
    participants?.participantCount ??
      requestContext?.participants?.participantCount ??
      ages.length
  );

  const availableMinutes = Number(
    safety.maxActivityMinutes ?? moment.timeNeededMinutes ?? NaN
  );

  return {
    participantCount: Number.isFinite(participantCount)
      ? participantCount
      : ages.length,
    participantAges: ages,
    ageBands: ages.map((age) => getPolicyAgeBand(age)),
    participantMode:
      participants?.mode ||
      requestContext?.participants?.mode ||
      null,
    activityStyle:
      activity.style ||
      activityStyle ||
      requestContext?.activity?.style ||
      null,
    energyLevel: energyLevel || activity.energyLevel || null,
    availableMinutes: Number.isFinite(availableMinutes)
      ? availableMinutes
      : null,
    space: moment.space || null,
    messLevel: moment.messLevel || null,
    noiseLevel: moment.noiseLevel || null,
    supervisionLevel:
      moment.supervisionLevel || safety.adultHelpAllowed || null,
    agePolicyVersion: AGE_POLICY_VERSION,
    fitPolicyVersion: FIT_POLICY_VERSION,
    requestId: requestId || requestContext?.requestId || null,
    ...(sourcePath ? { sourcePath } : {}),
    ...extra,
  };
}
