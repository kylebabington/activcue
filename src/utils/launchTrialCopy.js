// src/utils/launchTrialCopy.js

export const DEFAULT_LAUNCH_TRIAL_DAYS = 7;
export const DEFAULT_LAUNCH_TRIAL_LIMIT = 20;

export function isLaunchTrialOfferActive(launchTrial) {
  return launchTrial?.available === true;
}

export function launchTrialDays(launchTrial) {
  const days = Number(launchTrial?.days);
  return Number.isFinite(days) && days > 0
    ? days
    : DEFAULT_LAUNCH_TRIAL_DAYS;
}

export function launchTrialLimit(launchTrial) {
  const limit = Number(launchTrial?.limit);
  return Number.isFinite(limit) && limit > 0
    ? limit
    : DEFAULT_LAUNCH_TRIAL_LIMIT;
}

export function launchTrialRemaining(launchTrial) {
  const limit = launchTrialLimit(launchTrial);
  const remaining = Number(launchTrial?.remaining);
  if (!Number.isFinite(remaining) || remaining < 0) {
    return limit;
  }
  return Math.min(remaining, limit);
}

export function launchTrialSpotsLeft(launchTrial) {
  const remaining = launchTrialRemaining(launchTrial);
  const limit = launchTrialLimit(launchTrial);
  return `${remaining} of ${limit} families left`;
}

export function launchTrialOfferNote(launchTrial) {
  const days = launchTrialDays(launchTrial);
  return `Launch offer: ${days} days free. ${launchTrialSpotsLeft(launchTrial)}. Card required — $0 today.`;
}

export function launchTrialHeroKicker(launchTrial) {
  const days = launchTrialDays(launchTrial);
  return `Launch offer: ${days} days free — ${launchTrialSpotsLeft(launchTrial)}`;
}

export function launchTrialCtaLabel(launchTrial) {
  const days = launchTrialDays(launchTrial);
  return `Start ${days}-day free trial`;
}
