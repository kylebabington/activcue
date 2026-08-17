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

export function launchTrialOfferNote(launchTrial) {
  const days = launchTrialDays(launchTrial);
  const limit = launchTrialLimit(launchTrial);
  return `Launch offer: ${days} days free for the first ${limit} families. Card required — $0 today.`;
}

export function launchTrialHeroKicker(launchTrial) {
  const days = launchTrialDays(launchTrial);
  const limit = launchTrialLimit(launchTrial);
  return `Launch offer: ${days} days free for the first ${limit} families`;
}

export function launchTrialCtaLabel(launchTrial, plan = "monthly") {
  const days = launchTrialDays(launchTrial);
  const limit = launchTrialLimit(launchTrial);
  const suffix = ` — first ${limit} families`;
  if (plan === "annual") {
    return `Start ${days}-day free trial (annual)${suffix}`;
  }
  return `Start ${days}-day free trial${suffix}`;
}
