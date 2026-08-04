// src/features/app/usePlanBRescue.js

import { useCallback } from "react";
import { fetchPlanBActivities } from "../../api/sharedActivitiesApi";
import { trackProductEvent } from "../../utils/analytics";

export function usePlanBRescue({
  inventory,
  currentMoment,
  scoredActivities,
  handleTryNextBest,
  handleStartActivityFromUi,
  handleGenerateActivities,
  showStatus,
} = {}) {
  const handleTryNextBestWithLibrary = useCallback(async () => {
    trackProductEvent("plan_b_offered", { source: "batch" });
    const result = handleTryNextBest?.(scoredActivities);
    if (result?.usedBatch) {
      trackProductEvent("plan_b_started", { source: "batch" });
      trackProductEvent("plan_b_used", { source: "batch" });
      return;
    }

    const rejected = result?.rejected || scoredActivities?.[0]?.activity;
    if (rejected) {
      trackProductEvent("plan_b_rejected", {
        source: "batch-exhausted",
      });
    }

    try {
      const response = await fetchPlanBActivities({
        inventory,
        currentMoment,
        excludeCandidateIds: [
          rejected?.candidateId,
          ...(scoredActivities || [])
            .map((item) => item?.activity?.candidateId)
            .filter(Boolean),
        ].filter(Boolean),
        excludeCategories: Array.isArray(rejected?.categories)
          ? rejected.categories
          : [],
        limit: 3,
      });
      const next = response?.activities?.[0];
      if (next) {
        trackProductEvent("plan_b_started", { source: "shared-library" });
        trackProductEvent("plan_b_used", { source: "shared-library" });
        handleStartActivityFromUi?.(next);
        showStatus?.(`Plan B from the library: "${next.title}".`, "success");
        return;
      }
    } catch (error) {
      console.error("Plan B library lookup failed:", error);
    }

    showStatus?.(
      "No Plan B left in this batch or library. Generating fresh ideas…",
      "info"
    );
    handleGenerateActivities?.();
  }, [
    inventory,
    currentMoment,
    scoredActivities,
    handleTryNextBest,
    handleStartActivityFromUi,
    handleGenerateActivities,
    showStatus,
  ]);

  return { handleTryNextBestWithLibrary };
}
