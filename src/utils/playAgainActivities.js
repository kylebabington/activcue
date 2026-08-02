// src/utils/playAgainActivities.js

/**
 * Prefer recent finished successes for kids currently playing.
 * Falls back to global favorites when there is no child-scoped history.
 */
export function getRecentPlayAgainActivities({
  savedActivities = [],
  activityHistory = [],
  playingChildIds = [],
  limit = 3,
} = {}) {
  const saved = Array.isArray(savedActivities) ? savedActivities : [];
  const history = Array.isArray(activityHistory) ? activityHistory : [];
  const playingIds = Array.isArray(playingChildIds)
    ? playingChildIds.filter(Boolean)
    : [];

  const finished = history
    .filter((item) => item?.feedbackType === "finished" && item?.title)
    .slice()
    .reverse();

  const scopedFinished =
    playingIds.length > 0
      ? finished.filter(
          (item) =>
            !item.childId || playingIds.includes(item.childId)
        )
      : finished;

  const source = scopedFinished.length > 0 ? scopedFinished : finished;
  const picked = [];
  const seen = new Set();

  for (const item of source) {
    const key = String(item.title).trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);

    const favorite = saved.find(
      (activity) =>
        String(activity.title || "")
          .trim()
          .toLowerCase() === key
    );

    picked.push(
      favorite || {
        id: item.id || key,
        title: item.title,
        activityStyle: item.activityStyle || "simple",
        theme: item.theme || "",
        summary: item.summary || "",
        steps: Array.isArray(item.steps) ? item.steps : [],
        uses: Array.isArray(item.uses) ? item.uses : [],
        energy: item.energy || "medium",
        mess: item.mess || "low",
        adultHelp: item.adultHelp || "optional",
        estimatedMinutes: item.estimatedMinutes || null,
      }
    );

    if (picked.length >= limit) {
      break;
    }
  }

  if (picked.length > 0) {
    return picked;
  }

  return saved.slice(-limit).reverse();
}
