/**
 * Pure retry gating for activity-suggestions AI generation.
 * Keeps narrative failure, age-fit failure, and partial refill distinct.
 */

export function shouldRunNarrativeRetry({ generatedCount, qualitySurvivorCount }) {
  return generatedCount > 0 && qualitySurvivorCount === 0;
}

export function shouldRunAgeFitRetry({ qualitySurvivorCount, eligibleCount }) {
  return eligibleCount === 0 && qualitySurvivorCount > 0;
}

export function shouldRunPartialRefill({
  qualitySurvivorCount,
  eligibleCount,
  aiSlots,
  ageRetryAttempted = false,
  ageRetryEligibleCount = null,
}) {
  if (qualitySurvivorCount === 0) {
    return false;
  }
  if (eligibleCount >= aiSlots) {
    return false;
  }
  // After an age-fit retry that produced zero eligible, stop AI generation.
  if (ageRetryAttempted && ageRetryEligibleCount === 0) {
    return false;
  }
  return eligibleCount > 0 && eligibleCount < aiSlots;
}

export function shouldFailAgeFit({
  qualitySurvivorCount,
  eligibleCount,
  cachedKeptCount,
}) {
  return (
    eligibleCount === 0 &&
    cachedKeptCount === 0 &&
    qualitySurvivorCount > 0
  );
}
