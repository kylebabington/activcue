// src/components/GenerationLoader.jsx

import { useEffect, useState } from "react";
import { buildGenerationLoaderStages } from "../utils/generationLoaderStages";

export function GenerationLoader({
  currentMoment = {},
  activityStyle = "",
  inventoryEmpty = false,
}) {
  const timeNeededMinutes = currentMoment?.timeNeededMinutes;
  const messLevel = currentMoment?.messLevel;
  const [stageIndex, setStageIndex] = useState(0);
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
    const timers = nextStages.slice(1).map((stage, index) =>
      window.setTimeout(() => {
        setStageIndex(index + 1);
      }, stage.atMs)
    );
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [timeNeededMinutes, messLevel, activityStyle, inventoryEmpty]);

  const stage = stages[Math.min(stageIndex, stages.length - 1)] || stages[0];

  return (
    <section className="panel loading-panel" aria-live="polite" aria-busy="true">
      <h2>{stage.title}</h2>
      <p>{stage.detail}</p>
    </section>
  );
}

export default GenerationLoader;
