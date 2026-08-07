// src/features/demo/matchDemoActivities.js

import { scoreActivitiesForCurrentMoment } from "../../utils/sessionFitScore";
import { resolveChildAge } from "../../utils/childAge";
import { DEMO_ACTIVITY_POOL } from "../../constants/demoActivityPool";
import {
  DEFAULT_DEMO_MOMENT_ID,
  getDemoMoment,
} from "../../constants/demoMoments";
import { DEMO_CHILDREN, getDemoChild } from "../../constants/demoChildren";
import { storyifyCachedImaginativeActivity } from "./storyifyCachedImaginativeActivity";

const MIN_DEMO_AGE = 3;
const MAX_DEMO_AGE = 17;

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
  if (activity?.activityStyle) chips.push(String(activity.activityStyle));
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
  if (child.id.startsWith("demo-child-")) return child.id;
  return "maya";
}

function clampDemoAge(age) {
  const n = Math.round(Number(age));
  if (!Number.isFinite(n)) return 8;
  return Math.min(MAX_DEMO_AGE, Math.max(MIN_DEMO_AGE, n));
}

/**
 * Build lightweight temporary demo profiles from ages (no names required).
 */
export function buildDemoChildProfiles(childAges = [8]) {
  const ages = (Array.isArray(childAges) ? childAges : [childAges])
    .slice(0, 2)
    .map(clampDemoAge);

  if (ages.length === 0) {
    ages.push(8);
  }

  return ages.map((ageYears, index) => ({
    id: `demo-child-${index + 1}`,
    name: ages.length === 1 ? "Child" : `Child ${index + 1}`,
    ageYears,
    ageRange: null,
    birthDate: null,
    interests: "",
    needs: "",
  }));
}

function resolveDemoChildren({ childAges, childId }) {
  if (Array.isArray(childAges) && childAges.length > 0) {
    return buildDemoChildProfiles(childAges);
  }

  const child = getDemoChild(childId || "maya");
  return [child];
}

/**
 * Deterministic Fit Score matching for landing /demo.
 * Never calls OpenAI or network APIs.
 *
 * Prefer `childAges` (1–2 ages). `childId` remains for the landing teaser
 * that still uses named demo kids.
 */
/**
 * @param {object} [momentOverrides] Partial moment snapshot (time, space,
 *   messLevel, supervisionLevel, etc.) merged onto the selected demo moment.
 */
export function matchDemoActivities({
  momentId = DEFAULT_DEMO_MOMENT_ID,
  childId = "maya",
  childAges = null,
  pool = DEMO_ACTIVITY_POOL,
  limit = 3,
  offset = 0,
  activityStyle = null,
  momentOverrides = null,
} = {}) {
  const demoMoment = getDemoMoment(momentId);
  const children = resolveDemoChildren({ childAges, childId });
  const ages = children.map((child) => {
    const explicitAge = Number(child.ageYears);
    return Number.isFinite(explicitAge)
      ? explicitAge
      : resolveChildAge(child).ageYears;
  });
  const primaryChild = children[0];
  const currentMoment = {
    ...demoMoment.moment,
    ...(momentOverrides && typeof momentOverrides === "object"
      ? momentOverrides
      : {}),
  };

  let workingPool = Array.isArray(pool) ? pool : [];
  if (activityStyle === "simple" || activityStyle === "imaginative") {
    workingPool = workingPool.filter(
      (activity) => activity?.activityStyle === activityStyle
    );
  }

  const storyReadyPool = workingPool.map(storyifyCachedImaginativeActivity);

  const ranked = scoreActivitiesForCurrentMoment({
    activities: storyReadyPool,
    currentMoment,
    activityHistory: [],
    activitySessions: [],
    childAges: ages,
    selectedChildProfiles: children,
    scoringOptions: { activeChildId: primaryChild.id },
  });

  const start = Math.max(0, Number(offset) || 0);
  const size = Math.max(1, Number(limit) || 3);
  const slice = ranked.slice(start, start + size);

  return {
    momentId: demoMoment.id,
    moment: currentMoment,
    momentLabel: demoMoment.label,
    child: primaryChild,
    children,
    childId: childAges ? primaryChild.id : childIdFromProfile(primaryChild),
    childAges: ages,
    childAgeYears: ages[0],
    activityStyle: activityStyle || null,
    momentOverrides:
      momentOverrides && typeof momentOverrides === "object"
        ? momentOverrides
        : null,
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

/** Swap to the next already-ranked candidates (Plan B). */
export function rotateDemoResults(matchResult, overrides = {}) {
  const momentId =
    overrides.momentId || matchResult?.momentId || DEFAULT_DEMO_MOMENT_ID;
  const batchSize = overrides.limit || 3;
  const nextOffset =
    (matchResult?.offset || 0) + (matchResult?.results?.length || batchSize);
  const total = matchResult?.totalMatches || 0;
  const wrapped = total > 0 && nextOffset >= total ? 0 : nextOffset;

  const childAges =
    overrides.childAges ||
    matchResult?.childAges ||
    null;
  const childId = overrides.childId || matchResult?.childId || "maya";
  const activityStyle =
    overrides.activityStyle ?? matchResult?.activityStyle ?? null;
  const pool = overrides.pool;
  const momentOverrides =
    overrides.momentOverrides ?? matchResult?.momentOverrides ?? null;

  return matchDemoActivities({
    momentId,
    childId,
    childAges,
    activityStyle,
    pool,
    limit: batchSize,
    offset: wrapped,
    momentOverrides,
  });
}

export { DEMO_CHILDREN, MIN_DEMO_AGE, MAX_DEMO_AGE };
