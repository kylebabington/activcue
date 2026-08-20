// src/features/app/usePlanBRescue.js

import { useCallback } from "react";
import { fetchPlanBActivities } from "../../api/sharedActivitiesApi";
import { trackProductEvent } from "../../utils/analytics";

export function usePlanBRescue({
  inventory,
  currentMoment,
  activeMomentId,
  scoredActivities,
  handleTryNextBest,
  handleStartActivityFromUi,
  handleGenerateActivities,
  showStatus,
  activityStyle,
  selectedChildProfiles,
  activeChildProfile,
  activityMode,
} = {}) {
  const handleTryNextBestWithLibrary = useCallback(async () => {
    trackProductEvent("plan_b_offered", { source: "batch" });
    trackProductEvent("plan_b_next_best", { source: "batch" });
    const result = handleTryNextBest?.(scoredActivities);
    if (result?.usedBatch) {
      trackProductEvent("plan_b_started", { source: "current_batch" });
      trackProductEvent("plan_b_used", { source: "current_batch" });
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
        momentId: activeMomentId || null,
        activityStyle: activityStyle || "imaginative",
        selectedChildProfiles: selectedChildProfiles || [],
        activeChildProfile: activeChildProfile || null,
        activityMode: activityMode || "single-child",
        childIds: (selectedChildProfiles || [])
          .map((child) => child?.id)
          .filter(Boolean),
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
        trackProductEvent("plan_b_started", {
          source: "shared_library",
          recommendationBatchId: response?.recommendationBatchId || null,
        });
        trackProductEvent("plan_b_used", {
          source: "shared_library",
          recommendationBatchId: response?.recommendationBatchId || null,
        });
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
    trackProductEvent("regenerate", { source: "plan_b_exhausted" });
    handleGenerateActivities?.();
  }, [
    inventory,
    currentMoment,
    activeMomentId,
    scoredActivities,
    handleTryNextBest,
    handleStartActivityFromUi,
    handleGenerateActivities,
    showStatus,
    activityStyle,
    selectedChildProfiles,
    activeChildProfile,
    activityMode,
  ]);

  return { handleTryNextBestWithLibrary };
}
