// src/utils/confidenceCopy.js

import { getSessionFitBoost } from "./sessionFitScore";

/**
 * Parent-facing confidence line without dumping the full scoring model.
 */
export function buildConfidenceCopy(activity, sessions = [], childName = "") {
  if (!activity) {
    return "";
  }

  const boost = getSessionFitBoost(activity, sessions);
  const matching = (Array.isArray(sessions) ? sessions : []).filter(
    (session) => {
      const title = String(
        session.activityTitle || session.activity_title || ""
      )
        .trim()
        .toLowerCase();
      return title && title === String(activity.title || "").trim().toLowerCase();
    }
  );

  const name = childName || "your kid";

  if (matching.length >= 2) {
    const durations = matching
      .map((s) => Number(s.actualMinutes ?? s.actual_minutes))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (durations.length > 0) {
      const avg = Math.round(
        durations.reduce((sum, n) => sum + n, 0) / durations.length
      );
      return `Usually keeps ${name} busy independently for about ${Math.max(
        avg - 3,
        10
      )}–${avg + 3} minutes.`;
    }

    return `${name} has finished similar activities ${matching.length} times.`;
  }

  if (boost >= 4) {
    return "Great fit right now based on past independent-time wins.";
  }

  if (activity.energy === "low" || activity.mess === "low") {
    return "Good match for quiet independent time.";
  }

  return "";
}
