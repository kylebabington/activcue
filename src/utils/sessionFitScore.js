// src/utils/sessionFitScore.js

/*
 * Fit Score 2.0 — boost (or penalize) moment/inventory scores using past
 * activity_session outcomes: independence_rating and actual vs requested minutes.
 */

import {
  getTotalActivityScore,
  normalizeTextValue,
} from "./activityScoring";
import { normalizeActivityStyle } from "./activityStyle";

const INDEPENDENCE_BASE = {
  "worked-great": 8,
  "needed-me-few-times": 2,
  "didnt-last": -6,
};

function getSessionChildId(session) {
  return String(session?.childId ?? session?.child_id ?? "").trim();
}

/*
 * Single-child mode: only that child's sessions (strict — no empty childId).
 * Family mode / no activeChildId: household-wide sessions.
 */
export function filterSessionsForFitScore(
  sessions = [],
  { activeChildId = "", activityMode = "single-child" } = {}
) {
  const list = Array.isArray(sessions) ? sessions : [];

  if (activityMode === "family" || !activeChildId) {
    return list;
  }

  return list.filter((session) => getSessionChildId(session) === activeChildId);
}

function getIndependenceKey(session) {
  return normalizeTextValue(
    session?.independenceRating ?? session?.independence_rating
  );
}

function getActualMinutes(session) {
  const value = Number(session?.actualMinutes ?? session?.actual_minutes);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getRequestedMinutes(session) {
  const value = Number(
    session?.requestedMinutes ?? session?.requested_minutes
  );
  return Number.isFinite(value) && value > 0 ? value : null;
}

function durationSuccessMultiplier(session) {
  const actual = getActualMinutes(session);
  const requested = getRequestedMinutes(session);

  if (actual == null || requested == null) {
    return 1;
  }

  const ratio = actual / requested;

  if (ratio >= 0.9) {
    return 1.35;
  }

  if (ratio >= 0.7) {
    return 1.1;
  }

  if (ratio >= 0.45) {
    return 0.85;
  }

  return 0.55;
}

function sessionMatchesActivity(session, activity) {
  if (!session || !activity) {
    return false;
  }

  const sessionTitle = normalizeTextValue(
    session.activityTitle ?? session.activity_title
  );
  const activityTitle = normalizeTextValue(activity.title);

  if (sessionTitle && activityTitle && sessionTitle === activityTitle) {
    return true;
  }

  const sessionStyle = normalizeTextValue(
    session.activityStyle ?? session.activity_style
  );
  const activityStyle = normalizeTextValue(normalizeActivityStyle(activity));

  if (!sessionStyle || !activityStyle || sessionStyle !== activityStyle) {
    return false;
  }

  const sessionMess = normalizeTextValue(
    session.activityMess ?? session.activity_mess
  );
  const activityMess = normalizeTextValue(activity.mess);

  if (sessionMess && activityMess && sessionMess === activityMess) {
    return true;
  }

  const sessionEnergy = normalizeTextValue(
    session.activityEnergy ?? session.activity_energy
  );
  const activityEnergy = normalizeTextValue(activity.energy);

  return Boolean(
    sessionEnergy && activityEnergy && sessionEnergy === activityEnergy
  );
}

/*
 * Numeric boost for one activity given prior sessions (may be empty).
 * Pass already child-filtered sessions, or use scoreActivitiesForCurrentMoment.
 */
export function getSessionFitBoost(activity, sessions = []) {
  if (!activity || !Array.isArray(sessions) || sessions.length === 0) {
    return 0;
  }

  const matching = sessions.filter((session) =>
    sessionMatchesActivity(session, activity)
  );

  if (matching.length === 0) {
    return 0;
  }

  let total = 0;
  let weighed = 0;

  matching.forEach((session, index) => {
    const independenceKey = getIndependenceKey(session);
    const base = INDEPENDENCE_BASE[independenceKey];

    if (base == null) {
      return;
    }

    // Prefer recent sessions slightly (list assumed newest-first or oldest-first).
    const recencyWeight = 1 + Math.min(index, 4) * -0.05 + 0.2;
    const weight = Math.max(0.5, recencyWeight) * durationSuccessMultiplier(session);

    total += base * weight;
    weighed += 1;
  });

  if (weighed === 0) {
    return 0;
  }

  return Math.round((total / weighed) * 10) / 10;
}

export function applySessionFitBoost(baseScore, activity, sessions = []) {
  return Number(baseScore) + getSessionFitBoost(activity, sessions);
}

export function scoreActivitiesWithSessionFit(
  activities,
  { sessions = [], getBaseScore } = {}
) {
  const list = Array.isArray(activities) ? activities : [];

  return list
    .map((activity) => {
      const baseScore =
        typeof getBaseScore === "function" ? getBaseScore(activity) : 0;

      return {
        activity,
        score: applySessionFitBoost(baseScore, activity, sessions),
        sessionBoost: getSessionFitBoost(activity, sessions),
        baseScore,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/*
 * Canonical ranking for the activity board, auto-pick, and future recommenders.
 */
export function scoreActivitiesForCurrentMoment({
  activities,
  currentMoment,
  activityHistory,
  activitySessions,
  scoringOptions = {},
  activityMode = "single-child",
} = {}) {
  const activeChildId = scoringOptions.activeChildId || "";
  const sessionsForFit = filterSessionsForFitScore(activitySessions, {
    activeChildId,
    activityMode,
  });

  return scoreActivitiesWithSessionFit(activities, {
    sessions: sessionsForFit,
    getBaseScore: (activity) =>
      getTotalActivityScore(
        activity,
        currentMoment,
        activityHistory,
        scoringOptions
      ),
  });
}

export function pickBestActivityForCurrentMoment(options) {
  const scored = scoreActivitiesForCurrentMoment(options);
  return scored[0]?.activity || null;
}
