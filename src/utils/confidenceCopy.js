// src/utils/confidenceCopy.js

import { getVerifiedFitFacts } from "./inventoryFit";
import { getSessionFitBoost } from "./sessionFitScore";

function getSessionChildId(session) {
  return String(session?.childId ?? session?.child_id ?? "").trim();
}

function getIndependence(session) {
  return String(
    session?.independenceRating ?? session?.independence_rating ?? ""
  ).trim();
}

function titlesMatch(session, activity) {
  const sessionTitle = String(
    session.activityTitle || session.activity_title || ""
  )
    .trim()
    .toLowerCase();
  const activityTitle = String(activity?.title || "")
    .trim()
    .toLowerCase();
  return Boolean(sessionTitle && activityTitle && sessionTitle === activityTitle);
}

/**
 * Parent-facing confidence line without dumping the full scoring model.
 * Strong “Usually…” claims require same child + title + successful outcomes.
 */
export function buildConfidenceCopy(
  activity,
  sessions = [],
  childName = "",
  { childId = "" } = {}
) {
  if (!activity) {
    return "";
  }

  const list = Array.isArray(sessions) ? sessions : [];
  const childScoped = childId
    ? list.filter((session) => getSessionChildId(session) === childId)
    : list;

  const boost = getSessionFitBoost(activity, childScoped);
  const matchingTitle = childScoped.filter((session) =>
    titlesMatch(session, activity)
  );
  const successful = matchingTitle.filter(
    (session) => getIndependence(session) === "worked-great"
  );

  const name = childName || "your kid";
  const mostlySuccessful =
    matchingTitle.length >= 2 &&
    (successful.length >= 2 || successful.length / matchingTitle.length >= 0.5);

  if (mostlySuccessful) {
    const durations = successful
      .map((s) => Number(s.actualMinutes ?? s.actual_minutes))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (durations.length >= 2) {
      const avg = Math.round(
        durations.reduce((sum, n) => sum + n, 0) / durations.length
      );
      return `Usually keeps ${name} busy independently for about ${Math.max(
        avg - 3,
        10
      )}–${avg + 3} minutes.`;
    }

    return "This has worked before for independent time.";
  }

  if (successful.length >= 1 || boost >= 4) {
    return "This has worked before.";
  }

  if (matchingTitle.length >= 1 || boost > 0) {
    return "Good match based on similar past activities.";
  }

  if (activity.energy === "low" || activity.mess === "low") {
    return "Good match for quiet independent time.";
  }

  return "";
}

/**
 * 1–3 short human reasons for why an activity card is a good pick.
 */
export function buildRecommendationReasons(
  activity,
  sessions = [],
  childName = "",
  { childId = "", currentMoment = null } = {}
) {
  if (!activity) {
    return [];
  }

  const reasons = [];
  const confidence = buildConfidenceCopy(activity, sessions, childName, {
    childId,
  });

  if (confidence) {
    reasons.push(confidence);
  }

  const facts = getVerifiedFitFacts(activity, currentMoment);
  facts.slice(0, 2).forEach((fact) => {
    if (!reasons.some((reason) => reason.includes(fact))) {
      reasons.push(fact);
    }
  });

  if (reasons.length < 3 && currentMoment?.parentActivity) {
    const momentReason = `Fits while you ${currentMoment.parentActivity}`;
    if (!reasons.some((reason) => reason.toLowerCase().includes("fits"))) {
      reasons.push(momentReason);
    }
  }

  if (reasons.length === 0 && (activity.energy === "low" || activity.mess === "low")) {
    reasons.push("Good match for quiet independent time.");
  }

  return reasons.slice(0, 3);
}

/**
 * Short flywheel signal after enough successful independent sessions.
 * Reuses the same independence outcomes that train Fit Score.
 */
export function buildGettingBetterCopy(
  sessions = [],
  { childId = "", childName = "" } = {}
) {
  const list = Array.isArray(sessions) ? sessions : [];
  const childScoped = childId
    ? list.filter((session) => getSessionChildId(session) === childId)
    : list;

  const successful = childScoped.filter(
    (session) => getIndependence(session) === "worked-great"
  );

  if (successful.length < 2) {
    return "";
  }

  const name = childName || "your kid";
  const spaces = successful
    .map((session) =>
      String(session.space || session.activity_space || "").trim()
    )
    .filter(Boolean);
  const quietCount = successful.filter((session) => {
    const noise = String(
      session.noiseLevel || session.noise_level || ""
    ).toLowerCase();
    const energy = String(
      session.activityEnergy || session.activity_energy || ""
    ).toLowerCase();
    return noise === "quiet" || energy === "low";
  }).length;

  if (quietCount >= 2) {
    return `Getting better at quiet independent time for ${name}.`;
  }

  if (spaces.length >= 2) {
    const topSpace = spaces.sort(
      (a, b) =>
        spaces.filter((s) => s === b).length -
        spaces.filter((s) => s === a).length
    )[0];
    return `Getting better at activities in the ${topSpace} for ${name}.`;
  }

  return `Getting better at independent time for ${name}.`;
}
