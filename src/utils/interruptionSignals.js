// src/utils/interruptionSignals.js
// Derive interruption / independent-minutes signals from existing ratings.

const INTERRUPTION_BY_RATING = {
  "worked-great": "low",
  "needed-me-few-times": "medium",
  "didnt-last": "high",
};

export function interruptionLevelFromIndependence(independenceRating) {
  return INTERRUPTION_BY_RATING[independenceRating] || null;
}

/*
 * Approximate independent minutes delivered from a finished session.
 * Low interruption ≈ full actual minutes; medium ≈ 70%; high ≈ 30%.
 */
export function independentMinutesDelivered(session) {
  const actual = Number(session?.actualMinutes ?? session?.actual_minutes);
  if (!Number.isFinite(actual) || actual <= 0) {
    return 0;
  }

  const rating =
    session?.independenceRating || session?.independence_rating || "";
  const level = interruptionLevelFromIndependence(rating);

  if (level === "low") {
    return actual;
  }
  if (level === "medium") {
    return Math.round(actual * 0.7);
  }
  if (level === "high") {
    return Math.round(actual * 0.3);
  }

  return actual;
}
