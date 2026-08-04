// src/features/demo/matchDemoActivities.js

import { scoreActivitiesForCurrentMoment } from "../../utils/sessionFitScore";
import { resolveChildAge } from "../../utils/childAge";
import { DEMO_ACTIVITY_POOL } from "../../constants/demoActivityPool";
import { getDemoMoment } from "../../constants/demoMoments";
import { DEMO_CHILDREN, getDemoChild } from "../../constants/demoChildren";

function formatWhyFitChips(activity, moment) {
  const chips = [];
  const minutes =
    Number(activity?.estimatedMinutes) ||
    Number(moment?.timeNeededMinutes) ||
    null;
  if (minutes) chips.push(`${minutes} min`);
  if (activity?.mess) chips.push(`${activity.mess} mess`);
  if (activity?.energy) chips.push(String(activity.energy));
  if (activity?.adultHelp === "none") chips.push("independent");
  else if (activity?.adultHelp) chips.push(`${activity.adultHelp} help`);
  if (moment?.space) chips.push(String(moment.space).toLowerCase());
  if (activity?.ageFit?.minAge != null && activity?.ageFit?.maxAge != null) {
    chips.push(`ages ${activity.ageFit.minAge}–${activity.ageFit.maxAge}`);
  }
  return chips.slice(0, 6);
}

function childIdFromProfile(child) {
  if (!child?.id) return "maya";
  if (child.id.includes("jack")) return "jack";
  if (child.id.includes("leo")) return "leo";
  return "maya";
}

/**
 * Deterministic Fit Score matching for landing /demo.
 * Never calls OpenAI or network APIs.
 */
export function matchDemoActivities({
  momentId = "dinner",
  childId = "maya",
  pool = DEMO_ACTIVITY_POOL,
  limit = 3,
  offset = 0,
} = {}) {
  const demoMoment = getDemoMoment(momentId);
  const child = getDemoChild(childId);
  const explicitAge = Number(child.ageYears);
  const ageYears = Number.isFinite(explicitAge)
    ? explicitAge
    : resolveChildAge(child).ageYears;
  const currentMoment = demoMoment.moment;

  const ranked = scoreActivitiesForCurrentMoment({
    activities: Array.isArray(pool) ? [...pool] : [],
    currentMoment,
    activityHistory: [],
    activitySessions: [],
    childAges: [ageYears],
    selectedChildProfiles: [child],
    scoringOptions: { activeChildId: child.id },
  });

  const start = Math.max(0, Number(offset) || 0);
  const size = Math.max(1, Number(limit) || 3);
  const slice = ranked.slice(start, start + size);

  return {
    momentId: demoMoment.id,
    moment: currentMoment,
    momentLabel: demoMoment.label,
    child,
    childId: childIdFromProfile(child),
    childAgeYears: ageYears,
    totalMatches: ranked.length,
    offset: start,
    hasMore: start + size < ranked.length,
    results: slice.map((entry, index) => {
      const activity = entry.activity || entry;
      const score = entry.totalScore ?? entry.score ?? null;
      return {
        activity,
        rank: start + index + 1,
        score,
        fitPercent:
          typeof score === "number"
            ? Math.max(55, Math.min(99, Math.round(score)))
            : 90 - index * 3,
        whyFitChips: formatWhyFitChips(activity, currentMoment),
        whyItFits:
          activity?.whyItFits ||
          activity?.ageFit?.ageFitReason ||
          "Matches the time, mess, and independence you set.",
      };
    }),
    rankedActivities: ranked.map((entry) => entry.activity || entry),
  };
}

/** Swap to the next three already-ranked candidates (Plan B). */
export function rotateDemoResults(matchResult, overrides = {}) {
  const childId = overrides.childId || matchResult?.childId || "maya";
  const momentId = overrides.momentId || matchResult?.momentId || "dinner";
  const batchSize = overrides.limit || 3;
  const nextOffset =
    (matchResult?.offset || 0) + (matchResult?.results?.length || batchSize);
  const total = matchResult?.totalMatches || 0;
  const wrapped = total > 0 && nextOffset >= total ? 0 : nextOffset;

  return matchDemoActivities({
    momentId,
    childId,
    limit: batchSize,
    offset: wrapped,
  });
}

export { DEMO_CHILDREN };
