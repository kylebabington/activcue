// src/utils/sessionFitScore.js

/*
 * Fit Score 3.0 — boost (or penalize) moment/inventory scores using past
 * activity_session outcomes, historical moment similarity, trait matching,
 * duration reliability, failure signals, and recent repetition.
 *
 * Conceptual formula:
 *   Base Fit
 *   + Child Preference
 *   + Historical Activity Success
 *   + Historical Context Similarity
 *   + Duration Reliability
 *   - Failure Signals
 *   - Recent Repetition
 */

import {
  getTotalActivityScore,
  normalizeTextValue,
} from "./activityScoring";
import { normalizeActivityStyle } from "./activityStyle";
import {
  activityTraitsMatch,
  inferActivityTraits,
  traitsSimilarityScore,
} from "./activityTraits";

const INDEPENDENCE_BASE = {
  "worked-great": 8,
  "needed-me-few-times": 2,
  "needed-me": 2,
  "didnt-last": -6,
  abandoned: -5,
  canceled: -5,
};

const RECENT_REPETITION_WINDOW_MS = 1000 * 60 * 60 * 24 * 2;

function getSessionChildId(session) {
  return String(session?.childId ?? session?.child_id ?? "").trim();
}

function getSessionStartedAt(session) {
  const raw = session?.startedAt ?? session?.started_at ?? session?.createdAt;
  if (!raw) {
    return null;
  }

  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
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

function getCompletionStatus(session) {
  return normalizeTextValue(
    session?.completionStatus ?? session?.completion_status
  );
}

export function getActualMinutes(session) {
  const value = Number(session?.actualMinutes ?? session?.actual_minutes);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function getRequestedMinutes(session) {
  const value = Number(
    session?.requestedMinutes ?? session?.requested_minutes
  );
  return Number.isFinite(value) && value > 0 ? value : null;
}

/*
 * Duration reliability: actualMinutes / requestedMinutes.
 * Returns null when either side is missing.
 */
export function getDurationReliabilityRatio(session) {
  const actual = getActualMinutes(session);
  const requested = getRequestedMinutes(session);

  if (actual == null || requested == null) {
    return null;
  }

  return actual / requested;
}

export function getDurationReliabilityScore(session) {
  const ratio = getDurationReliabilityRatio(session);

  if (ratio == null) {
    return 0;
  }

  if (ratio >= 0.9) {
    return 3;
  }

  if (ratio >= 0.7) {
    return 1.5;
  }

  if (ratio >= 0.45) {
    return -1;
  }

  return -3;
}

function durationSuccessMultiplier(session) {
  const ratio = getDurationReliabilityRatio(session);

  if (ratio == null) {
    return 1;
  }

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

/*
 * Map independence ratings + completion failures to a signed signal.
 * worked-great strong+, needed-me slight+, didnt-last/abandoned/canceled negative.
 */
export function getIndependenceSignal(session) {
  const independenceKey = getIndependenceKey(session);
  if (independenceKey && Object.prototype.hasOwnProperty.call(INDEPENDENCE_BASE, independenceKey)) {
    return INDEPENDENCE_BASE[independenceKey];
  }

  const status = getCompletionStatus(session);
  if (status === "abandoned" || status === "canceled") {
    return INDEPENDENCE_BASE[status];
  }

  return null;
}

export function getFailureSignal(session) {
  const independenceKey = getIndependenceKey(session);
  const status = getCompletionStatus(session);

  if (
    independenceKey === "didnt-last" ||
    status === "abandoned" ||
    status === "canceled"
  ) {
    return Math.abs(getIndependenceSignal(session) || 4);
  }

  return 0;
}

function sessionAsActivity(session) {
  return {
    title: session?.activityTitle ?? session?.activity_title,
    activityStyle: session?.activityStyle ?? session?.activity_style,
    energy: session?.activityEnergy ?? session?.activity_energy,
    mess: session?.activityMess ?? session?.activity_mess,
    uses: session?.activitySupplies ?? session?.activity_supplies,
    summary: session?.summary || "",
  };
}

function spacesAreSimilar(a, b) {
  const left = normalizeTextValue(a);
  const right = normalizeTextValue(b);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  return left.includes(right) || right.includes(left);
}

function minutesAreSimilar(a, b, tolerance = 10) {
  const left = Number(a);
  const right = Number(b);

  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) {
    return false;
  }

  return Math.abs(left - right) <= tolerance;
}

/*
 * How closely a prior session's moment matches the current moment.
 * Higher = weigh that session's outcome more heavily.
 */
export function getHistoricalContextSimilarity(
  session,
  currentMoment = null,
  { activeChildId = "" } = {}
) {
  if (!session || !currentMoment) {
    return 0;
  }

  let score = 0;

  const sessionChildId = getSessionChildId(session);
  if (activeChildId && sessionChildId && sessionChildId === activeChildId) {
    score += 3;
  }

  const sessionParentActivity = normalizeTextValue(
    session.parentActivity ?? session.parent_activity
  );
  const momentParentActivity = normalizeTextValue(currentMoment.parentActivity);

  if (
    sessionParentActivity &&
    momentParentActivity &&
    sessionParentActivity === momentParentActivity
  ) {
    score += 2;
  }

  const sessionAvailability = normalizeTextValue(
    session.parentAvailability ?? session.parent_availability
  );
  const momentAvailability = normalizeTextValue(currentMoment.availability);

  if (
    sessionAvailability &&
    momentAvailability &&
    sessionAvailability === momentAvailability
  ) {
    score += 2;
  }

  if (
    minutesAreSimilar(
      getRequestedMinutes(session),
      currentMoment.timeNeededMinutes
    )
  ) {
    score += 1.5;
  }

  if (spacesAreSimilar(session.space, currentMoment.space)) {
    score += 2;
  }

  const sessionNoise = normalizeTextValue(
    session.noiseLimit ?? session.noise_limit
  );
  const momentNoise = normalizeTextValue(currentMoment.noiseLevel);

  if (sessionNoise && momentNoise && sessionNoise === momentNoise) {
    score += 1;
  }

  const sessionMess = normalizeTextValue(
    session.messLimit ?? session.mess_limit
  );
  const momentMess = normalizeTextValue(currentMoment.messLevel);

  if (sessionMess && momentMess && sessionMess === momentMess) {
    score += 1;
  }

  const sessionSupervision = normalizeTextValue(
    session.supervisionLevel ?? session.supervision_level
  );
  const momentSupervision = normalizeTextValue(currentMoment.supervisionLevel);

  if (
    sessionSupervision &&
    momentSupervision &&
    sessionSupervision === momentSupervision
  ) {
    score += 2;
  }

  return score;
}

export function getContextSimilarityWeight(session, currentMoment, options = {}) {
  const similarity = getHistoricalContextSimilarity(
    session,
    currentMoment,
    options
  );

  // 0 → 1.0, ~14 max → ~2.0
  return 1 + Math.min(similarity, 14) / 14;
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

  const sessionProxy = sessionAsActivity(session);

  if (activityTraitsMatch(sessionProxy, activity, { minScore: 4 })) {
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

export function getChildPreferenceScore(activity, sessions = [], { activeChildId = "" } = {}) {
  if (!activity || !Array.isArray(sessions) || sessions.length === 0) {
    return 0;
  }

  const activityTraits = inferActivityTraits(activity);
  let preference = 0;
  let samples = 0;

  sessions.forEach((session) => {
    if (activeChildId) {
      const sessionChildId = getSessionChildId(session);
      if (sessionChildId && sessionChildId !== activeChildId) {
        return;
      }
    }

    const signal = getIndependenceSignal(session);
    if (signal == null || signal <= 0) {
      return;
    }

    const similarity = traitsSimilarityScore(
      activityTraits,
      inferActivityTraits(sessionAsActivity(session))
    );

    if (similarity < 4) {
      return;
    }

    preference += (signal / 8) * (similarity / 4);
    samples += 1;
  });

  if (samples === 0) {
    return 0;
  }

  return Math.round((preference / samples) * 10) / 10;
}

export function getRecentRepetitionPenalty(activity, sessions = [], { now = Date.now() } = {}) {
  if (!activity || !Array.isArray(sessions) || sessions.length === 0) {
    return 0;
  }

  const activityTitle = normalizeTextValue(activity.title);
  const activityCategory = inferActivityTraits(activity).category;
  let penalty = 0;

  sessions.forEach((session) => {
    const startedAt = getSessionStartedAt(session);
    if (startedAt == null || now - startedAt > RECENT_REPETITION_WINDOW_MS) {
      return;
    }

    const sessionTitle = normalizeTextValue(
      session.activityTitle ?? session.activity_title
    );
    const sessionCategory = inferActivityTraits(sessionAsActivity(session)).category;

    if (activityTitle && sessionTitle && activityTitle === sessionTitle) {
      penalty += 4;
      return;
    }

    if (activityCategory && sessionCategory && activityCategory === sessionCategory) {
      penalty += 1.5;
    }
  });

  return Math.round(Math.min(penalty, 8) * 10) / 10;
}

/*
 * Per-session contribution used by Fit Score 3.0.
 */
export function scoreHistoricalSession(
  session,
  activity,
  {
    currentMoment = null,
    activeChildId = "",
    sessionIndex = 0,
  } = {}
) {
  if (!sessionMatchesActivity(session, activity)) {
    return null;
  }

  const independence = getIndependenceSignal(session);
  if (independence == null) {
    return null;
  }

  const contextSimilarity = getHistoricalContextSimilarity(session, currentMoment, {
    activeChildId,
  });
  const contextWeight = getContextSimilarityWeight(session, currentMoment, {
    activeChildId,
  });
  const durationReliability = getDurationReliabilityScore(session);
  const failureSignals = getFailureSignal(session);
  const recencyWeight = Math.max(0.5, 1.2 - Math.min(sessionIndex, 4) * 0.05);
  const durationMultiplier = durationSuccessMultiplier(session);

  const historicalActivitySuccess = independence * contextWeight * durationMultiplier;
  const historicalContextSimilarity = contextSimilarity * 0.35;

  const contribution =
    historicalActivitySuccess +
    historicalContextSimilarity +
    durationReliability -
    failureSignals * 0.25;

  return {
    contribution: contribution * recencyWeight,
    independence,
    contextSimilarity,
    contextWeight,
    durationReliability,
    failureSignals,
  };
}

/*
 * Numeric boost for one activity given prior sessions (may be empty).
 * Pass already child-filtered sessions, or use scoreActivitiesForCurrentMoment.
 *
 * Third argument is optional Fit Score 3.0 context (backward compatible).
 */
export function getSessionFitBoost(activity, sessions = [], options = {}) {
  if (!activity || !Array.isArray(sessions) || sessions.length === 0) {
    return 0;
  }

  const {
    currentMoment = null,
    activeChildId = "",
    now = Date.now(),
  } = options;

  let total = 0;
  let weighed = 0;

  sessions.forEach((session, index) => {
    const scored = scoreHistoricalSession(session, activity, {
      currentMoment,
      activeChildId,
      sessionIndex: index,
    });

    if (!scored) {
      return;
    }

    total += scored.contribution;
    weighed += 1;
  });

  const historicalAverage = weighed === 0 ? 0 : total / weighed;
  const childPreference = getChildPreferenceScore(activity, sessions, {
    activeChildId,
  });
  const recentRepetition = getRecentRepetitionPenalty(activity, sessions, {
    now,
  });

  const boost = historicalAverage + childPreference - recentRepetition;

  return Math.round(boost * 10) / 10;
}

export function applySessionFitBoost(
  baseScore,
  activity,
  sessions = [],
  options = {}
) {
  return Number(baseScore) + getSessionFitBoost(activity, sessions, options);
}

export function scoreActivitiesWithSessionFit(
  activities,
  { sessions = [], getBaseScore, currentMoment = null, activeChildId = "" } = {}
) {
  const list = Array.isArray(activities) ? activities : [];

  return list
    .map((activity) => {
      const baseScore =
        typeof getBaseScore === "function" ? getBaseScore(activity) : 0;
      const fitOptions = { currentMoment, activeChildId };

      return {
        activity,
        score: applySessionFitBoost(baseScore, activity, sessions, fitOptions),
        sessionBoost: getSessionFitBoost(activity, sessions, fitOptions),
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
    currentMoment,
    activeChildId,
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
