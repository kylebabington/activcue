// src/features/activities/useActivityGeneration.js

import { useCallback, useRef, useState } from "react";
import {
  getActivitySuggestions,
  getPresetActivities,
  unlockPresetActivity,
} from "../../api/activityApi";
import { ApiRequestError, AuthenticationError } from "../../api/apiClient";
import { buildSimpleActivitiesFromTemplates } from "../../utils/simpleActivityTemplates";
import {
  getEligiblePresets,
  takeRotatedOne,
  takeRotatedSlice,
} from "../../utils/presetDemo";
import {
  activityPassesInventorySoftCheck,
  buildInventoryOnlyFeedback,
  buildStructuredPreferenceContext,
  logActivityScoreTable,
  normalizeActivitiesToInventory,
  pickBestActivityForCurrentMoment,
  scoreActivitiesForCurrentMoment,
} from "./activityService";
import {
  buildAutoStartFeedbackContext,
  buildKidBoredFeedbackContext,
  filterStartableActivities,
} from "./activityGenerationHelpers";

export function useActivityGeneration(deps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIntent, setLoadingIntent] = useState(null);
  const [presetRotationIndex, setPresetRotationIndex] = useState({
    simple: 0,
    imaginative: 0,
  });
  const generateActivitiesRef = useRef(null);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const beginGeneration = useCallback((intent = "generate") => {
    setIsLoading(true);
    setLoadingIntent(intent);
  }, []);

  const endGeneration = useCallback(() => {
    setIsLoading(false);
    setLoadingIntent(null);
  }, []);

  const handleGenerateActivities = useCallback(
    async (customFeedbackContext = "", options = {}) => {
      const {
        allowOfflineFallback = false,
        preferSimpleTemplates = false,
      } = options;
      const d = depsRef.current;

      setIsLoading(true);
      d.showStatus?.("");
      d.setActivities?.([]);

      const preferenceContext = buildStructuredPreferenceContext(
        d.activityHistory,
        {
          activeChildId:
            d.activityMode === "family" ? "" : d.activeChildId || "",
        }
      );

      const combinedFeedback = [customFeedbackContext, preferenceContext]
        .filter(Boolean)
        .join("\n\n");

      async function requestActivities(feedbackContext) {
        const previousActivityTitles = (d.activityHistory || [])
          .slice(-10)
          .map((historyItem) => historyItem.title);

        return getActivitySuggestions({
          currentMoment: d.currentMoment,
          parentActivity: d.currentMoment.parentActivity,
          parentAvailability: d.currentMoment.availability,
          inventory: d.inventory,
          kidMood: d.kidMood,
          messLevel: d.currentMoment.messLevel,
          activitySpace: d.currentMoment.space,
          childAgeRange: d.effectiveChildAgeRange,
          activityStyle: d.kidActivityStyle,
          activityMode: d.activityMode,
          activeChildProfile: d.activeChildProfile,
          selectedChildProfiles: d.selectedChildProfiles,
          safetySettings: {
            ...d.safetySettings,
            maxActivityMinutes: d.currentMoment.timeNeededMinutes,
            quietMode: d.currentMoment.noiseLevel === "quiet",
          },
          feedbackContext,
          previousActivityTitles,
          playModeTheme: d.uiTheme,
        });
      }

      function finalizeActivities(rawActivities) {
        const normalized = normalizeActivitiesToInventory(
          rawActivities,
          d.inventory
        );
        d.setActivities?.(normalized);
        return normalized;
      }

      try {
        if (preferSimpleTemplates && d.kidActivityStyle === "simple") {
          const templateActivities = buildSimpleActivitiesFromTemplates({
            inventory: d.inventory,
            currentMoment: d.currentMoment,
            count: 3,
          });

          if (templateActivities.length > 0) {
            d.showStatus?.("Quick ideas ready — no wait.", "success");
            return finalizeActivities(templateActivities);
          }

          const { activities: presetActivities } = await getPresetActivities({
            style: "simple",
          });
          const unlockedPresets = presetActivities
            .filter((activity) => activity && !activity.isLocked)
            .slice(0, 3);

          if (unlockedPresets.length > 0) {
            d.showStatus?.("Quick ideas from the free library.", "success");
            return finalizeActivities(unlockedPresets);
          }

          d.showStatus?.(
            "No quick ideas fit this moment. Try adjusting supplies or the parent moment.",
            "info"
          );
          return [];
        }

        let generatedActivities = await requestActivities(combinedFeedback);
        let normalized = normalizeActivitiesToInventory(
          generatedActivities,
          d.inventory
        );

        const allFailedInventoryCheck =
          normalized.length > 0 &&
          normalized.every(
            (activity) =>
              !activityPassesInventorySoftCheck(activity, d.inventory)
          );

        if (allFailedInventoryCheck) {
          const strongerFeedback = [
            combinedFeedback,
            buildInventoryOnlyFeedback(d.inventory),
          ]
            .filter(Boolean)
            .join("\n\n");

          generatedActivities = await requestActivities(strongerFeedback);
          normalized = normalizeActivitiesToInventory(
            generatedActivities,
            d.inventory
          );
        }

        d.setActivities?.(normalized);
        return normalized;
      } catch (error) {
        console.error(error);

        if (error instanceof AuthenticationError) {
          d.showStatus?.(
            error.message ||
              "Your secure session could not be verified. Refresh and try again.",
            "error"
          );
          return null;
        }

        if (
          error instanceof ApiRequestError &&
          error.code === "SUBSCRIPTION_REQUIRED"
        ) {
          d.showStatus?.(
            "Personalized AI activities require a paid subscription.",
            "info"
          );
          return null;
        }

        if (allowOfflineFallback || d.kidActivityStyle === "simple") {
          const templateActivities = buildSimpleActivitiesFromTemplates({
            inventory: d.inventory,
            currentMoment: d.currentMoment,
            count: 3,
          });

          if (templateActivities.length > 0) {
            d.showStatus?.(
              "Couldn’t reach the idea server — showing quick simple ideas from your supplies.",
              "info"
            );
            return finalizeActivities(templateActivities);
          }
        }

        d.showStatus?.("Something went wrong while generating ideas.", "error");
        return [];
      } finally {
        setIsLoading(false);
        setLoadingIntent(null);
      }
    },
    []
  );

  generateActivitiesRef.current = handleGenerateActivities;

  const startPresetActivity = useCallback(async (activity) => {
    const d = depsRef.current;
    let readyActivity = activity;

    if (activity?.isLocked) {
      const payload = await unlockPresetActivity(activity.id);
      d.mergePresetEntitlement?.(payload.entitlement);
      readyActivity = payload.activity;

      if (readyActivity?.isLocked) {
        throw new ApiRequestError("This pretend activity is still locked.", {
          code: "PRESET_STILL_LOCKED",
        });
      }

      d.setActivities?.((current) =>
        current.map((item) =>
          item?.id === readyActivity.id
            ? { ...item, ...readyActivity, isLocked: false }
            : item
        )
      );
    }

    d.handleStartActivity?.(readyActivity);
    return readyActivity;
  }, []);

  const getBestActivityForCurrentMoment = useCallback((activityOptions) => {
    const d = depsRef.current;
    if (!Array.isArray(activityOptions) || activityOptions.length === 0) {
      return null;
    }

    const selected = pickBestActivityForCurrentMoment({
      activities: activityOptions,
      currentMoment: d.currentMoment,
      activityHistory: d.activityHistory,
      activitySessions: d.activitySessions,
      scoringOptions: d.scoringOptions,
      activityMode: d.activityMode,
    });

    const scoredOptions = scoreActivitiesForCurrentMoment({
      activities: activityOptions,
      currentMoment: d.currentMoment,
      activityHistory: d.activityHistory,
      activitySessions: d.activitySessions,
      scoringOptions: d.scoringOptions,
      activityMode: d.activityMode,
    });
    logActivityScoreTable(
      scoredOptions,
      d.currentMoment,
      d.activityHistory
    );

    return selected;
  }, []);

  const handleGenerateKidActivities = useCallback(
    async (options = {}) => {
      const d = depsRef.current;
      d.setKidMood?.(d.kidEnergyLevel);
      setLoadingIntent(options.preferSimpleTemplates ? "quick" : "board");

      const preferSimpleTemplates = Boolean(options.preferSimpleTemplates);

      if (!d.entitlementHydrated && preferSimpleTemplates) {
        setIsLoading(true);
        d.showStatus?.("");

        try {
          const templateActivities = buildSimpleActivitiesFromTemplates({
            inventory: d.inventory,
            currentMoment: d.currentMoment,
            count: 3,
          });

          if (templateActivities.length > 0) {
            const normalized = normalizeActivitiesToInventory(
              templateActivities,
              d.inventory
            );
            d.setActivities?.(normalized);
            d.showStatus?.("Quick ideas ready — no wait.", "success");
            d.navigate?.("/quest");
            return;
          }

          d.showStatus?.(
            "Still checking your plan. Try again in a moment.",
            "info"
          );
        } finally {
          setIsLoading(false);
          setLoadingIntent(null);
        }

        return;
      }

      if (!d.entitlementHydrated) {
        d.showStatus?.(
          "Still checking your plan. Try again in a moment.",
          "info"
        );
        setIsLoading(false);
        setLoadingIntent(null);
        return;
      }

      if (d.isDemoMode) {
        if (!preferSimpleTemplates && d.imBoredDisabled) {
          d.showStatus?.(
            "Nice work finishing your free pretend sample. Unlock more pretend worlds with Plus — or keep using Simple / Quick ideas.",
            "info"
          );
          setIsLoading(false);
          setLoadingIntent(null);
          return;
        }

        setIsLoading(true);
        d.showStatus?.("");

        try {
          if (preferSimpleTemplates || d.kidActivityStyle === "simple") {
            if (preferSimpleTemplates) {
              const templateActivities = buildSimpleActivitiesFromTemplates({
                inventory: d.inventory,
                currentMoment: d.currentMoment,
                count: 3,
              });

              if (templateActivities.length > 0) {
                const normalized = normalizeActivitiesToInventory(
                  templateActivities,
                  d.inventory
                );
                d.setActivities?.(normalized);
                d.showStatus?.("Quick ideas ready — no wait.", "success");
                d.navigate?.("/quest");
                return;
              }
            }

            const payload = await getPresetActivities({ style: "simple" });
            d.mergePresetEntitlement?.(payload.entitlement);
            const eligible = getEligiblePresets(payload.activities, "simple", {
              ...d.entitlement,
              ...payload.entitlement,
            });

            if (preferSimpleTemplates) {
              const slice = eligible.slice(0, 3);
              if (slice.length === 0) {
                d.showStatus?.(
                  "No quick ideas available right now. Try again in a moment.",
                  "info"
                );
                d.setActivities?.([]);
                d.navigate?.("/quest");
                return;
              }

              d.setActivities?.(
                normalizeActivitiesToInventory(slice, d.inventory)
              );
              d.showStatus?.(
                "Sample presets — Plus personalizes to this moment.",
                "success"
              );
              d.navigate?.("/quest");
              return;
            }

            const { slice, nextIndex } = takeRotatedSlice(
              eligible,
              presetRotationIndex.simple,
              3
            );
            setPresetRotationIndex((current) => ({
              ...current,
              simple: nextIndex,
            }));

            if (slice.length === 0) {
              d.showStatus?.(
                "No sample activities available right now.",
                "info"
              );
              d.setActivities?.([]);
              d.navigate?.("/quest");
              return;
            }

            d.setActivities?.(
              normalizeActivitiesToInventory(slice, d.inventory)
            );
            d.showStatus?.(
              "Showing sample presets — Plus personalizes to this moment.",
              "success"
            );
            d.navigate?.("/quest");
            return;
          }

          const payload = await getPresetActivities({ style: "imaginative" });
          d.mergePresetEntitlement?.(payload.entitlement);
          const mergedEntitlement = {
            ...d.entitlement,
            ...payload.entitlement,
          };
          const eligible = getEligiblePresets(
            payload.activities,
            "imaginative",
            mergedEntitlement
          );

          const { slice, nextIndex } = takeRotatedSlice(
            eligible,
            presetRotationIndex.imaginative,
            3
          );
          setPresetRotationIndex((current) => ({
            ...current,
            imaginative: nextIndex,
          }));

          if (slice.length === 0) {
            d.showStatus?.("No pretend samples available right now.", "info");
            d.setActivities?.([]);
            d.navigate?.("/quest");
            return;
          }

          d.setActivities?.(
            normalizeActivitiesToInventory(slice, d.inventory)
          );
          d.showStatus?.(
            "Showing sample presets — Plus personalizes to this moment. Unlock one pretend quest free when you start.",
            "success"
          );
          d.navigate?.("/quest");
        } catch (error) {
          console.error("Demo preset generation failed:", error);
          d.showStatus?.(
            error instanceof Error
              ? error.message
              : "Could not load sample activities.",
            "error"
          );
          d.setActivities?.([]);
          d.navigate?.("/quest");
        } finally {
          setIsLoading(false);
          setLoadingIntent(null);
        }

        return;
      }

      const generatedActivities = await handleGenerateActivities(
        buildKidBoredFeedbackContext({
          kidActivityStyle: d.kidActivityStyle,
          kidEnergyLevel: d.kidEnergyLevel,
        }),
        {
          allowOfflineFallback: true,
          preferSimpleTemplates,
        }
      );

      if (!generatedActivities?.length) {
        d.navigate?.("/quest");
        return;
      }

      d.navigate?.("/quest");
    },
    [handleGenerateActivities, presetRotationIndex]
  );

  const handleStartSomethingForMe = useCallback(async () => {
    const d = depsRef.current;
    d.setKidMood?.(d.kidEnergyLevel);
    setLoadingIntent("auto-start");
    d.setActiveActivity?.(null);

    if (!d.entitlementHydrated) {
      d.showStatus?.(
        "Still checking your plan. Try again in a moment.",
        "info"
      );
      setIsLoading(false);
      setLoadingIntent(null);
      return;
    }

    if (d.isDemoMode) {
      setIsLoading(true);
      d.showStatus?.("");

      try {
        const style =
          d.kidActivityStyle === "imaginative" ? "imaginative" : "simple";

        if (style === "imaginative" && d.freeImaginativeUnlockUsed) {
          const payload = await getPresetActivities({ style: "imaginative" });
          d.mergePresetEntitlement?.(payload.entitlement);
          const mergedEntitlement = {
            ...d.entitlement,
            ...payload.entitlement,
          };
          const eligible = getEligiblePresets(
            payload.activities,
            "imaginative",
            mergedEntitlement
          );
          const unlocked = eligible[0];

          if (!unlocked) {
            d.showStatus?.(
              "You finished that free pretend world. Unlock more with Plus, or keep using Simple / Quick ideas.",
              "info"
            );
            d.navigate?.("/quest");
            return;
          }

          await startPresetActivity(unlocked);
          d.navigate?.("/quest");
          d.showStatus?.(`Started: "${unlocked.title}".`, "success");
          return;
        }

        const payload = await getPresetActivities({ style });
        d.mergePresetEntitlement?.(payload.entitlement);
        const mergedEntitlement = {
          ...d.entitlement,
          ...payload.entitlement,
        };
        const eligible = getEligiblePresets(
          payload.activities,
          style,
          mergedEntitlement
        );
        const { activity, nextIndex } = takeRotatedOne(
          eligible,
          presetRotationIndex[style]
        );
        setPresetRotationIndex((current) => ({
          ...current,
          [style]: nextIndex,
        }));

        if (!activity) {
          d.showStatus?.(
            "I could not start a sample activity. Try I'm Bored instead.",
            "error"
          );
          d.navigate?.("/quest");
          return;
        }

        await startPresetActivity(activity);
        d.navigate?.("/quest");
        d.showStatus?.(
          `Started sample: "${activity.title}". Plus personalizes to this moment.`,
          "success"
        );
      } catch (error) {
        console.error("Demo auto-start failed:", error);
        const code = error instanceof ApiRequestError ? error.code : "";

        if (code === "FREE_IMAGINATIVE_UNLOCK_USED") {
          d.showStatus?.(
            "You finished your free pretend sample. Keep using Simple / Quick ideas, or unlock more pretend with Plus.",
            "info"
          );
        } else {
          d.showStatus?.(
            error instanceof Error
              ? error.message
              : "Could not start a sample activity.",
            "error"
          );
        }
        d.navigate?.("/quest");
      } finally {
        setIsLoading(false);
        setLoadingIntent(null);
      }

      return;
    }

    const generatedActivities = await handleGenerateActivities(
      buildAutoStartFeedbackContext({
        kidActivityStyle: d.kidActivityStyle,
        kidEnergyLevel: d.kidEnergyLevel,
      }),
      { allowOfflineFallback: true }
    );

    if (generatedActivities === null) {
      d.navigate?.("/quest");
      return;
    }

    const selectedActivity =
      getBestActivityForCurrentMoment(generatedActivities);

    if (!selectedActivity) {
      d.showStatus?.(
        "I could not start an activity automatically. Try choosing one instead.",
        "error"
      );
      d.navigate?.("/quest");
      return;
    }

    d.handleStartActivity?.(selectedActivity);
    d.navigate?.("/quest");
    d.showStatus?.(
      `Started: "${selectedActivity.title}" because it fits right now.`,
      "success"
    );
  }, [
    getBestActivityForCurrentMoment,
    handleGenerateActivities,
    presetRotationIndex,
    startPresetActivity,
  ]);

  const handleStartActivityFromUi = useCallback(
    async (activity) => {
      const d = depsRef.current;
      if (!activity?.isLocked) {
        d.handleStartActivity?.(activity);
        return;
      }

      try {
        setIsLoading(true);
        const ready = await startPresetActivity(activity);
        d.showStatus?.(
          `Unlocked and started: "${ready.title}". Celebrate that free pretend win — Plus unlocks more worlds when you are ready.`,
          "success"
        );
      } catch (error) {
        const code = error instanceof ApiRequestError ? error.code : "";

        if (code === "FREE_IMAGINATIVE_UNLOCK_USED") {
          d.showStatus?.(
            "Your free pretend sample is already used. Keep using Simple / Quick ideas, or unlock more pretend with Plus.",
            "info"
          );
        } else {
          d.showStatus?.(
            error instanceof Error
              ? error.message
              : "Could not unlock that activity.",
            "error"
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [startPresetActivity]
  );

  const handleAutoPickQuest = useCallback(async () => {
    const d = depsRef.current;
    if (!d.activities?.length) {
      d.showStatus?.(
        "No activities available yet. Choose something from Kid Mode first.",
        "error"
      );
      return;
    }

    const candidates = filterStartableActivities({
      activities: d.activities,
      freeImaginativeUnlockUsed: d.freeImaginativeUnlockUsed,
      freeImaginativeActivityId: d.entitlement?.freeImaginativeActivityId,
    });

    const selectedActivity = getBestActivityForCurrentMoment(candidates);

    if (!selectedActivity) {
      d.showStatus?.(
        d.freeImaginativeUnlockUsed
          ? "You finished your free pretend sample. Pick an unlocked activity, keep using Simple, or unlock more with Plus."
          : "I could not pick an activity yet. Try generating again.",
        d.freeImaginativeUnlockUsed ? "info" : "error"
      );
      return;
    }

    try {
      setIsLoading(true);
      const ready = await startPresetActivity(selectedActivity);
      d.showStatus?.(
        `Picked for you: "${ready.title}" because it best fits right now.`,
        "success"
      );
    } catch (error) {
      const code = error instanceof ApiRequestError ? error.code : "";

      if (code === "FREE_IMAGINATIVE_UNLOCK_USED") {
        d.showStatus?.(
          "You finished your free pretend sample. Keep using Simple / Quick ideas, or unlock more pretend with Plus.",
          "info"
        );
      } else {
        d.showStatus?.(
          error instanceof Error
            ? error.message
            : "Could not start that activity.",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [getBestActivityForCurrentMoment, startPresetActivity]);

  return {
    isLoading,
    loadingIntent,
    setIsLoading,
    setLoadingIntent,
    beginGeneration,
    endGeneration,
    generateActivitiesRef,
    handleGenerateActivities,
    handleGenerateKidActivities,
    handleStartSomethingForMe,
    startPresetActivity,
    handleStartActivityFromUi,
    handleAutoPickQuest,
    getBestActivityForCurrentMoment,
    ready: true,
  };
}
