// src/features/app/useScoredActivities.js

import { useEffect, useMemo } from "react";
import {
  logActivityScoreTable,
  scoreActivitiesForCurrentMoment,
} from "../activities";
import { buildGettingBetterCopy } from "../../utils/confidenceCopy";

export function useScoredActivities({
  activities,
  currentMoment,
  activityHistory,
  activitySessions,
  inventory,
  activityMode,
  activeChildId,
  activeChildProfile,
  selectedChildProfiles,
  activityPreferences,
} = {}) {
  const scoringOptions = useMemo(
    () => ({
      inventory,
      activeChildId: activityMode === "family" ? "" : activeChildId || "",
      activeChildProfile:
        activityMode === "family" ? null : activeChildProfile || null,
      activityPreferences: activityPreferences || {},
    }),
    [
      inventory,
      activityMode,
      activeChildId,
      activeChildProfile,
      activityPreferences,
    ]
  );

  const scoredActivities = useMemo(() => {
    return scoreActivitiesForCurrentMoment({
      activities,
      currentMoment,
      activityHistory,
      activitySessions,
      scoringOptions,
      activityMode,
      selectedChildProfiles,
    });
  }, [
    activities,
    currentMoment,
    activityHistory,
    scoringOptions,
    activitySessions,
    activityMode,
    selectedChildProfiles,
  ]);

  useEffect(() => {
    if (!activities?.length) {
      return;
    }

    logActivityScoreTable(
      scoredActivities,
      currentMoment,
      activityHistory,
      scoringOptions
    );
  }, [
    activities?.length,
    scoredActivities,
    currentMoment,
    activityHistory,
    scoringOptions,
  ]);

  const gettingBetterCopy = useMemo(
    () =>
      buildGettingBetterCopy(activitySessions, {
        childId: activityMode === "family" ? "" : activeChildId || "",
        childName: activeChildProfile?.name || "",
      }),
    [activitySessions, activityMode, activeChildId, activeChildProfile]
  );

  return {
    scoringOptions,
    scoredActivities,
    gettingBetterCopy,
  };
}
