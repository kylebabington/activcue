// src/components/GenerationLoader.jsx

import { useEffect, useState } from "react";
import { buildGenerationLoaderStages } from "../utils/generationLoaderStages";

const ELAPSED_VISIBLE_AFTER_MS = 10000;

export function GenerationLoader({
  currentMoment = {},
  activityStyle = "",
  inventoryEmpty = false,
}) {
  const timeNeededMinutes = currentMoment?.timeNeededMinutes;
  const messLevel = currentMoment?.messLevel;
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stages, setStages] = useState(() =>
    buildGenerationLoaderStages(currentMoment, {
      activityStyle,
      inventoryEmpty,
    })
  );

  useEffect(() => {
    const nextStages = buildGenerationLoaderStages(
      { timeNeededMinutes, messLevel },
      { activityStyle, inventoryEmpty }
    );
    setStages(nextStages);
    setStageIndex(0);
    setElapsedSeconds(0);

    const startedAt = Date.now();
    const timers = nextStages.slice(1).map((stage, index) =>
      window.setTimeout(() => {
        setStageIndex(index + 1);
      }, stage.atMs)
    );
    const elapsedTimer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(elapsedTimer);
    };
  }, [timeNeededMinutes, messLevel, activityStyle, inventoryEmpty]);

  const stage = stages[Math.min(stageIndex, stages.length - 1)] || stages[0];
  const showElapsed = elapsedSeconds * 1000 >= ELAPSED_VISIBLE_AFTER_MS;

  return (
    <section
      className="panel loading-panel loading-panel--generating"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-panel-progress" aria-hidden="true">
        <span className="loading-panel-progress-bar" />
      </div>
      <h2>{stage.title}</h2>
      <p>{stage.detail}</p>
      {showElapsed ? (
        <p className="loading-panel-elapsed">
          Still working — {elapsedSeconds}s so far
        </p>
      ) : null}
    </section>
  );
}

export default GenerationLoader;
