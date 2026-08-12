// src/utils/generationLoaderStages.js

/**
 * Staged personalized loader copy while waiting for activity suggestions.
 * Stages advance on timers (not fake token progress).
 */
export function buildGenerationLoaderStages(currentMoment = {}, options = {}) {
  const minutes = Number(currentMoment?.timeNeededMinutes) || null;
  const mess = String(currentMoment?.messLevel || "").toLowerCase();
  const style = String(options.activityStyle || "").toLowerCase();
  const inventoryEmpty = Boolean(options.inventoryEmpty);

  const timeLine = minutes
    ? `Fitting ideas into about ${minutes} minutes…`
    : "Checking how much time you have…";

  const messLine =
    mess === "low"
      ? "Keeping mess low…"
      : mess === "high"
        ? "Matching your mess tolerance…"
        : "Matching energy and mess level…";

  const styleLine =
    style === "simple"
      ? "Looking for plain, easy-to-start ideas"
      : style === "imaginative"
        ? "Spinning up creative challenges"
        : "Picking a style that fits";

  const inventoryLine = inventoryEmpty
    ? "Using common household basics…"
    : "Matching what you already have…";

  return [
    { atMs: 0, title: "Finding a good fit…", detail: timeLine },
    { atMs: 2200, title: "Narrowing it down…", detail: messLine },
    { atMs: 4800, title: styleLine, detail: inventoryLine },
    {
      atMs: 8500,
      title: "Almost ready…",
      detail: "Putting the finishing touches on three ideas…",
    },
  ];
}
