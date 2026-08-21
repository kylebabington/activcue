/**
 * Safe parsing for OpenAI structured activity JSON.
 * Detects truncated / incomplete payloads without throwing.
 */

export function parseStructuredActivitiesResponse(
  rawText,
  { expectedCount = 3 } = {}
) {
  const expected = Math.max(1, Number(expectedCount) || 1);

  if (typeof rawText !== "string" || !rawText.trim()) {
    return {
      ok: false,
      partial: false,
      activities: [],
      reason: "empty-response",
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      partial: false,
      activities: [],
      reason: "json-parse-failed",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      partial: false,
      activities: [],
      reason: "not-object",
    };
  }

  if (!Array.isArray(parsed.activities)) {
    return {
      ok: false,
      partial: false,
      activities: [],
      reason: "missing-activities",
    };
  }

  const activities = parsed.activities.filter(
    (activity) => activity && typeof activity === "object" && !Array.isArray(activity)
  );

  if (activities.length === 0) {
    return {
      ok: false,
      partial: false,
      activities: [],
      reason: "empty-activities",
    };
  }

  if (activities.length < expected) {
    return {
      ok: false,
      partial: true,
      activities,
      reason: "incomplete-count",
      expected,
      received: activities.length,
    };
  }

  return {
    ok: true,
    partial: false,
    activities: activities.slice(0, expected),
    reason: null,
    expected,
    received: activities.length,
  };
}

export function buildMalformedJsonRetrySteer(reason) {
  return [
    "FORMAT RETRY: The previous response was incomplete or malformed JSON.",
    `Parse issue: ${reason || "unknown"}.`,
    "Return complete valid JSON only that matches the schema.",
    "Do not truncate. Include every required field for each activity.",
    "Do not change activityStyle. Do not substitute a different play style.",
  ].join("\n");
}

export function buildMissingSlotRetrySteer({
  missingCount,
  existingTitles = [],
  activityStyle,
} = {}) {
  const titles =
    Array.isArray(existingTitles) && existingTitles.length > 0
      ? existingTitles.map((t) => `"${t}"`).join(", ")
      : "(none yet)";
  return [
    `SLOT FILL: Generate exactly ${missingCount} additional complete activit${
      missingCount === 1 ? "y" : "ies"
    }.`,
    `Requested activityStyle must remain "${activityStyle || "imaginative"}".`,
    "Do not change style. Do not return simple crafts if imaginative was requested.",
    `Already have these titles — do not repeat them: ${titles}.`,
    "Return complete valid JSON with an activities array of that exact length.",
  ].join("\n");
}
