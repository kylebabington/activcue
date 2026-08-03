// src/utils/familyInsights.js

/**
 * Derives short parent-facing insight statements from activity sessions
 * and local activity history (by parent activity, child, and energy).
 */

function getIndependence(session) {
  return String(
    session?.independenceRating ?? session?.independence_rating ?? ""
  ).trim();
}

function getParentActivity(session) {
  return String(
    session?.parentActivity ?? session?.parent_activity ?? ""
  ).trim();
}

function getChildId(session) {
  return String(session?.childId ?? session?.child_id ?? "").trim();
}

function getActualMinutes(session) {
  const value = Number(session?.actualMinutes ?? session?.actual_minutes);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getEnergy(row) {
  return String(
    row?.activityEnergy ??
      row?.activity_energy ??
      row?.energy ??
      row?.kidMood ??
      ""
  )
    .trim()
    .toLowerCase();
}

function isSuccessful(session) {
  return getIndependence(session) === "worked-great";
}

function isAttempted(session) {
  const status = String(
    session?.completionStatus ?? session?.completion_status ?? ""
  ).trim();
  if (status === "in-progress") {
    return false;
  }
  return Boolean(getIndependence(session) || status === "finished");
}

function topKeyByCount(map) {
  let bestKey = "";
  let bestCount = 0;

  for (const [key, count] of map.entries()) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }

  return bestCount > 0 ? { key: bestKey, count: bestCount } : null;
}

function rateByKey(sessions, getKey, { minAttempts = 3 } = {}) {
  const stats = new Map();

  sessions.forEach((session) => {
    const key = getKey(session);
    if (!key) {
      return;
    }

    const current = stats.get(key) || { successes: 0, attempts: 0 };
    current.attempts += 1;
    if (isSuccessful(session)) {
      current.successes += 1;
    }
    stats.set(key, current);
  });

  let best = null;

  for (const [key, value] of stats.entries()) {
    if (value.attempts < minAttempts) {
      continue;
    }

    const rate = value.successes / value.attempts;
    if (
      !best ||
      rate > best.rate ||
      (rate === best.rate && value.successes > best.successes)
    ) {
      best = { key, rate, ...value };
    }
  }

  return best;
}

/**
 * @returns {Array<{ id: string, statement: string, detail?: string }>}
 */
export function buildFamilyInsights({
  activitySessions = [],
  activityHistory = [],
  childProfiles = [],
} = {}) {
  const sessions = (Array.isArray(activitySessions) ? activitySessions : []).filter(
    isAttempted
  );
  const history = Array.isArray(activityHistory) ? activityHistory : [];
  const profiles = Array.isArray(childProfiles) ? childProfiles : [];
  const insights = [];

  if (sessions.length === 0 && history.length === 0) {
    return [
      {
        id: "empty",
        statement: "Insights will show up after a few activities.",
        detail: "Finish activities and mark how independent they felt.",
      },
    ];
  }

  const successful = sessions.filter(isSuccessful);
  const attempted = sessions.length;
  const successRate =
    attempted > 0 ? Math.round((successful.length / attempted) * 100) : null;

  if (successRate != null && attempted >= 2) {
    insights.push({
      id: "success-rate",
      statement: `${successRate}% of recent activities worked independently.`,
      detail: `${successful.length} of ${attempted} rated “worked great”.`,
    });
  }

  const independentMinutes = successful
    .map(getActualMinutes)
    .filter((n) => n != null);

  if (independentMinutes.length >= 2) {
    const avg = Math.round(
      independentMinutes.reduce((sum, n) => sum + n, 0) /
        independentMinutes.length
    );
    insights.push({
      id: "avg-minutes",
      statement: `Average independent stretch is about ${avg} minutes.`,
      detail: `Based on ${independentMinutes.length} successful sessions.`,
    });
  }

  const bestParent = rateByKey(sessions, getParentActivity);
  if (bestParent && bestParent.successes >= 3) {
    insights.push({
      id: "parent-activity",
      statement: `${bestParent.key} works best lately.`,
      detail: `${bestParent.successes} of ${bestParent.attempts} sessions went well.`,
    });
  }

  const childNameById = new Map(
    profiles.map((child) => [String(child.id || ""), child.name || "Your kid"])
  );
  const bestChild = rateByKey(sessions, getChildId);
  if (bestChild && bestChild.successes >= 3) {
    const name = childNameById.get(bestChild.key) || "Your kid";
    insights.push({
      id: "child",
      statement: `${name} has the strongest recent success rate.`,
      detail: `${bestChild.successes} of ${bestChild.attempts} worked great.`,
    });
  }

  const energySuccess = new Map();
  successful.forEach((session) => {
    const energy = getEnergy(session);
    if (!energy) {
      return;
    }
    energySuccess.set(energy, (energySuccess.get(energy) || 0) + 1);
  });

  const topEnergy = topKeyByCount(energySuccess);
  if (topEnergy && topEnergy.count >= 2) {
    const label =
      topEnergy.key === "low" || topEnergy.key === "quiet"
        ? "quiet / low-energy"
        : topEnergy.key === "high" || topEnergy.key === "energetic"
          ? "high-energy"
          : topEnergy.key;
    insights.push({
      id: "energy",
      statement: `${label} activities are landing best right now.`,
      detail: `${topEnergy.count} recent wins matched that energy.`,
    });
  }

  const finishedHistory = history.filter(
    (item) => item?.feedbackType === "finished"
  );
  if (finishedHistory.length >= 3 && insights.length < 2) {
    insights.push({
      id: "history-volume",
      statement: `You’ve logged ${finishedHistory.length} finished activities.`,
      detail: "Keep rating independence so suggestions get sharper.",
    });
  }

  if (insights.length === 0) {
    return [
      {
        id: "building",
        statement: "Still learning what works for your family.",
        detail: "A couple more finished activities will unlock clearer patterns.",
      },
    ];
  }

  return insights.slice(0, 6);
}
