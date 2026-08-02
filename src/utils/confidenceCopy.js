// src/utils/confidenceCopy.js

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
