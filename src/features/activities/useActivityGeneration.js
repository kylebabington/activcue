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
  buildStructuredPreferenceContext,
  logActivityScoreTable,
  normalizeActivitiesToInventory,
  pickBestActivityForCurrentMoment,
  scoreActivitiesForCurrentMoment,
} from "./activityService";
import {
  buildAutoStartIntent,
  buildKidBoredIntent,
} from "./activityIntent";
import { filterStartableActivities } from "./activityGenerationHelpers";
import {
  buildActivityRequestContext,
  requestContextToLegacyPayload,
} from "./buildActivityRequestContext";
import { markSuggestionsShownAt, getTimeToStartTiming } from "../../utils/timeToStart";
import { resolveChildAge } from "../../utils/childAge";
import { playModeFlavorFromActivityStyle } from "../../constants/activityPreferences";
import { createRecommendationBatch } from "../../api/recommendationTelemetryApi";
import { trackFirstActivityGeneratedOnce, trackProductEvent } from "../../utils/analytics";
import { storyifyCachedImaginativeActivity } from "../demo/storyifyCachedImaginativeActivity";

async function recordLocalBatch(activities, { source, momentId, mode = "normal" }) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return { activities, recommendationBatchId: null, momentId: momentId || null };
  }

  try {
    const result = await createRecommendationBatch({
      source,
      mode,
      momentId: momentId || getTimeToStartTiming()?.momentId || null,
      activities,
    });
    return {
      activities: Array.isArray(result?.activities) ? result.activities : activities,
      recommendationBatchId: result?.recommendationBatchId || null,
      momentId: result?.momentId || momentId || null,
    };
  } catch (error) {
    console.warn("Could not persist recommendation batch:", error);
    return {
      activities,
      recommendationBatchId: null,
      momentId: momentId || null,
    };
  }
}

function markBoardShown(activities, { recommendationBatchId = null, momentId = null } = {}) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return;
  }
  markSuggestionsShownAt(undefined, {
    recommendationBatchId,
    momentId: momentId || getTimeToStartTiming()?.momentId || null,
    candidateIds: activities
      .map((activity) => activity?.candidateId || activity?.candidate_id)
      .filter(Boolean),
  });
}

async function presentLocalBoard(deps, activities, source = "templates") {
  const recorded = await recordLocalBatch(activities, {
    source,
    momentId: deps.activeMomentId || getTimeToStartTiming()?.momentId || null,
  });
  const normalized = normalizeActivitiesToInventory(
    recorded.activities,
    deps.inventory
  );
  deps.setActivities?.(normalized);
  markBoardShown(normalized, {
    recommendationBatchId: recorded.recommendationBatchId,
    momentId: recorded.momentId,
  });
  return normalized;
}

function resolveOldestChildAgeYears(deps) {
  const ages = resolveSelectedChildAges(deps);
  return ages.length > 0 ? Math.max(...ages) : null;
}

function resolveSelectedChildAges(deps) {
  const profiles =
    Array.isArray(deps.selectedChildProfiles) &&
    deps.selectedChildProfiles.length > 0
      ? deps.selectedChildProfiles
      : deps.activeChildProfile
        ? [deps.activeChildProfile]
        : [];
  return profiles
    .map((profile) => resolveChildAge(profile).ageYears)
    .filter((age) => Number.isFinite(age));
}

function resolveSelectedChildProfiles(deps) {
  return Array.isArray(deps.selectedChildProfiles) &&
    deps.selectedChildProfiles.length > 0
    ? deps.selectedChildProfiles
    : deps.activeChildProfile
      ? [deps.activeChildProfile]
      : [];
}

export function useActivityGeneration(deps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIntent, setLoadingIntent] = useState(null);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [generationErrorMessage, setGenerationErrorMessage] = useState("");
  const [presetRotationIndex, setPresetRotationIndex] = useState({
    simple: 0,
    imaginative: 0,
  });
  const generateActivitiesRef = useRef(null);
  const lastGenerationArgsRef = useRef({
    customFeedbackContext: "",
    options: {},
  });
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const beginGeneration = useCallback((intent = "generate") => {
    setIsLoading(true);
    setLoadingIntent(intent);
    setGenerationFailed(false);
    setGenerationErrorMessage("");
  }, []);

  const endGeneration = useCallback(() => {
    setIsLoading(false);
    setLoadingIntent(null);
  }, []);

  const handleGenerateActivities = useCallback(
    async (customFeedbackContext = "", options = {}) => {
      const {
        preferSimpleTemplates = false,
        generationIntent = null,
        excludeCandidateIds = [],
      } = options;
      const d = depsRef.current;

      lastGenerationArgsRef.current = {
        customFeedbackContext,
        options,
      };
      setIsLoading(true);
      setGenerationFailed(false);
      setGenerationErrorMessage("");
      d.showStatus?.("");
      d.setActivities?.([]);
      d.setActiveActivity?.(null);
      d.clearLastCompletedQuest?.();

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

      async function requestActivities(feedbackContext, intent = generationIntent) {
        const previousActivityTitles = (d.activityHistory || [])
          .slice(-10)
          .map((historyItem) => historyItem.title);

        const historyExcludeIds = (d.activityHistory || [])
          .filter((item) => {
            const type = item?.feedbackType;
            return (
              type === "too-messy" ||
              type === "too-hard" ||
              type === "too-easy" ||
              type === "too-young" ||
              type === "too-old" ||
              type === "need-quieter" ||
              type === "activity_rejected" ||
              type === "need-another-idea"
            );
          })
          .map((item) => item.candidateId || item.candidate_id)
          .filter(Boolean);

        const mergedExcludeIds = [
          ...new Set(
            [...(excludeCandidateIds || []), ...historyExcludeIds]
              .map((id) => String(id))
              .filter(Boolean)
          ),
        ];

        trackProductEvent("generation_requested", {
          momentId: d.activeMomentId || getTimeToStartTiming()?.momentId || null,
          activityStyle: intent?.activityStyle || d.kidActivityStyle,
        });

        const requestContext = buildActivityRequestContext({
          playingChildIds: d.playingChildIds,
          childProfiles: d.childProfiles,
          selectedChildProfiles: d.selectedChildProfiles,
          activeChildProfile: d.activeChildProfile,
          activityMode: d.activityMode,
          activeChildId: d.activeChildId,
          currentMoment: d.currentMoment,
          safetySettings: d.safetySettings,
          activityPreferences: d.activityPreferences,
          inventory: d.inventory,
          kidActivityStyle: intent?.activityStyle || d.kidActivityStyle,
          kidEnergyLevel: intent?.energyLevel || d.kidEnergyLevel,
          generationIntent: intent,
        });
        const legacy = requestContextToLegacyPayload(requestContext);

        const result = await getActivitySuggestions({
          ...legacy,
          momentId: d.activeMomentId || getTimeToStartTiming()?.momentId || null,
          feedbackContext,
          generationIntent: intent || undefined,
          previousActivityTitles,
          excludeCandidateIds: mergedExcludeIds,
          playModeTheme: playModeFlavorFromActivityStyle(
            d.activityPreferences?.activityStylePreference
          ),
        });

        if (result?.momentId && d.setActiveMomentId) {
          d.setActiveMomentId(result.momentId);
        }

        trackProductEvent("activity_generated", {
          momentId: result?.momentId || d.activeMomentId || null,
          recommendationBatchId: result?.recommendationBatchId || null,
          candidateCount: Array.isArray(result?.activities)
            ? result.activities.length
            : 0,
          source: result?.source || null,
        });

        return result;
      }

      async function finalizeActivities(rawActivities, meta = {}) {
        let activities = (Array.isArray(rawActivities) ? rawActivities : []).map(
          (activity) => storyifyCachedImaginativeActivity(activity)
        );
        let recommendationBatchId = meta.recommendationBatchId || null;
        let momentId =
          meta.momentId ||
          d.activeMomentId ||
          getTimeToStartTiming()?.momentId ||
          null;

        if (!recommendationBatchId && activities.length > 0) {
          const recorded = await recordLocalBatch(activities, {
            source: meta.source || "templates",
            momentId,
            mode: meta.mode || "normal",
          });
          activities = recorded.activities;
          recommendationBatchId = recorded.recommendationBatchId;
          momentId = recorded.momentId || momentId;
        }

        const normalized = normalizeActivitiesToInventory(
          activities,
          d.inventory
        );
        d.setActivities?.(normalized);
        markBoardShown(normalized, { recommendationBatchId, momentId });
        if (normalized.length > 0) {
          trackFirstActivityGeneratedOnce({
            momentId,
            recommendationBatchId,
            candidateCount: normalized.length,
            source: meta.source || null,
          });
        }
        return normalized;
      }

      try {
        if (preferSimpleTemplates && d.kidActivityStyle === "simple") {
          const templateActivities = buildSimpleActivitiesFromTemplates({
            inventory: d.inventory,
            currentMoment: d.currentMoment,
            count: 3,
            oldestChildAgeYears: resolveOldestChildAgeYears(d),
          });

          if (templateActivities.length > 0) {
            d.showStatus?.("Quick ideas ready — no wait.", "success");
            return finalizeActivities(templateActivities, { source: "templates" });
          }

          const { activities: presetActivities } = await getPresetActivities({
            style: "simple",
            ages: resolveSelectedChildAges(d),
          });
          const unlockedPresets = presetActivities
            .filter((activity) => activity && !activity.isLocked)
            .slice(0, 3);

          if (unlockedPresets.length > 0) {
            d.showStatus?.("Quick ideas from the free library.", "success");
            return finalizeActivities(unlockedPresets, { source: "curated" });
          }

          d.showStatus?.(
            "No quick ideas fit this moment. Try adjusting supplies or the parent moment.",
            "info"
          );
          return [];
        }

        let generated = await requestActivities(combinedFeedback);
        let generatedActivities = generated?.activities || [];
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
          d.showStatus?.(
            "Ideas ready — some may need supplies you don't have listed. Adjust supplies in Parent if needed.",
            "info"
          );
        }

        return finalizeActivities(normalized, {
          recommendationBatchId: generated?.recommendationBatchId,
          momentId: generated?.momentId,
          source: "openai",
        });
      } catch (error) {
        console.error(error);

        if (error instanceof AuthenticationError) {
          const message =
            error.message ||
            "Your secure session could not be verified. Refresh and try again.";
          setGenerationFailed(true);
          setGenerationErrorMessage(message);
          d.showStatus?.(message, "error");
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

        if (error instanceof ApiRequestError && error.status === 422) {
          const message =
            error.message ||
            "Could not generate age-appropriate activities. Try regenerating.";
          setGenerationFailed(true);
          setGenerationErrorMessage(message);
          d.showStatus?.(message, "info");
          return [];
        }

        trackProductEvent("AI_error", {
          status: error instanceof ApiRequestError ? error.status : null,
          code: error instanceof ApiRequestError ? error.code : null,
          activityStyle: d.kidActivityStyle || null,
        });

        const templateActivities = buildSimpleActivitiesFromTemplates({
          inventory: d.inventory,
          currentMoment: d.currentMoment,
          count: 3,
          oldestChildAgeYears: resolveOldestChildAgeYears(d),
        });

        if (templateActivities.length > 0) {
          d.showStatus?.(
            "Couldn’t reach the idea server — showing quick simple ideas from your supplies.",
            "info"
          );
          return finalizeActivities(templateActivities, { source: "templates" });
        }

        const message = "Something went wrong while generating ideas.";
        setGenerationFailed(true);
        setGenerationErrorMessage(message);
        d.showStatus?.(message, "error");
        return [];
      } finally {
        setIsLoading(false);
        setLoadingIntent(null);
      }
    },
    []
  );

  const retryLastGeneration = useCallback(async () => {
    const { customFeedbackContext, options } = lastGenerationArgsRef.current;
    const generate = generateActivitiesRef.current;
    if (typeof generate !== "function") {
      return [];
    }
    return generate(customFeedbackContext, options);
  }, []);

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
      selectedChildProfiles: d.selectedChildProfiles,
    });

    const scoredOptions = scoreActivitiesForCurrentMoment({
      activities: activityOptions,
      currentMoment: d.currentMoment,
      activityHistory: d.activityHistory,
      activitySessions: d.activitySessions,
      scoringOptions: d.scoringOptions,
      activityMode: d.activityMode,
      selectedChildProfiles: d.selectedChildProfiles,
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
      setLoadingIntent(options.preferSimpleTemplates ? "quick" : "board");

      const preferSimpleTemplates = Boolean(options.preferSimpleTemplates);
      const oldestChildAgeYears = resolveOldestChildAgeYears(d);

      function clearStickyQuestForNewBoard() {
        d.setActiveActivity?.(null);
        d.clearLastCompletedQuest?.();
      }

      if (!d.entitlementHydrated && preferSimpleTemplates) {
        setIsLoading(true);
        d.showStatus?.("");
        clearStickyQuestForNewBoard();
        d.setActivities?.([]);
        d.navigate?.("/quest");

        try {
          const templateActivities = buildSimpleActivitiesFromTemplates({
            inventory: d.inventory,
            currentMoment: d.currentMoment,
            count: 3,
            oldestChildAgeYears,
          });

          if (templateActivities.length > 0) {
            await presentLocalBoard(d, templateActivities, "templates");
            d.showStatus?.("Quick ideas ready — no wait.", "success");
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
        clearStickyQuestForNewBoard();
        d.setActivities?.([]);
        d.navigate?.("/quest");

        try {
          if (preferSimpleTemplates || d.kidActivityStyle === "simple") {
            if (preferSimpleTemplates) {
              const templateActivities = buildSimpleActivitiesFromTemplates({
                inventory: d.inventory,
                currentMoment: d.currentMoment,
                count: 3,
                oldestChildAgeYears,
              });

              if (templateActivities.length > 0) {
                await presentLocalBoard(d, templateActivities, "templates");
                d.showStatus?.("Quick ideas ready — no wait.", "success");
                return;
              }
            }

            const payload = await getPresetActivities({
              style: "simple",
              ages: resolveSelectedChildAges(d),
            });
            d.mergePresetEntitlement?.(payload.entitlement);
            const eligible = getEligiblePresets(
              payload.activities,
              "simple",
              {
                ...d.entitlement,
                ...payload.entitlement,
              },
              resolveSelectedChildProfiles(d)
            );

            if (preferSimpleTemplates) {
              const slice = eligible.slice(0, 3);
              if (slice.length === 0) {
                d.showStatus?.(
                  "No quick ideas available right now. Try again in a moment.",
                  "info"
                );
                d.setActivities?.([]);
                return;
              }

              await presentLocalBoard(d, slice, "curated");
              d.showStatus?.(
                "Sample presets — Plus personalizes to this moment.",
                "success"
              );
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
              return;
            }

            await presentLocalBoard(d, slice, "curated");
            d.showStatus?.(
              "Showing sample presets — Plus personalizes to this moment.",
              "success"
            );
            return;
          }

          const payload = await getPresetActivities({
            style: "imaginative",
            ages: resolveSelectedChildAges(d),
          });
          d.mergePresetEntitlement?.(payload.entitlement);
          const mergedEntitlement = {
            ...d.entitlement,
            ...payload.entitlement,
          };
          const eligible = getEligiblePresets(
            payload.activities,
            "imaginative",
            mergedEntitlement,
            resolveSelectedChildProfiles(d)
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
            return;
          }

          await presentLocalBoard(d, slice, "curated");
          d.showStatus?.(
            "Showing sample presets — Plus personalizes to this moment. Unlock one pretend activity free when you start.",
            "success"
          );
        } catch (error) {
          console.error("Demo preset generation failed:", error);
          d.showStatus?.(
            error instanceof Error
              ? error.message
              : "Could not load sample activities.",
            "error"
          );
          d.setActivities?.([]);
        } finally {
          setIsLoading(false);
          setLoadingIntent(null);
        }

        return;
      }

      clearStickyQuestForNewBoard();
      setIsLoading(true);
      d.setActivities?.([]);
      d.navigate?.("/quest");

      const intent = buildKidBoredIntent({
        kidActivityStyle: d.kidActivityStyle,
        kidEnergyLevel: d.kidEnergyLevel,
      });

      await handleGenerateActivities("", {
        allowOfflineFallback: true,
        preferSimpleTemplates,
        generationIntent: intent,
      });
    },
    [handleGenerateActivities, presetRotationIndex]
  );

  const handleStartSomethingForMe = useCallback(async () => {
    const d = depsRef.current;
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
          const payload = await getPresetActivities({
            style: "imaginative",
            ages: resolveSelectedChildAges(d),
          });
          d.mergePresetEntitlement?.(payload.entitlement);
          const mergedEntitlement = {
            ...d.entitlement,
            ...payload.entitlement,
          };
          const eligible = getEligiblePresets(
            payload.activities,
            "imaginative",
            mergedEntitlement,
            resolveSelectedChildProfiles(d)
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

        const payload = await getPresetActivities({
          style,
          ages: resolveSelectedChildAges(d),
        });
        d.mergePresetEntitlement?.(payload.entitlement);
        const mergedEntitlement = {
          ...d.entitlement,
          ...payload.entitlement,
        };
        const eligible = getEligiblePresets(
          payload.activities,
          style,
          mergedEntitlement,
          resolveSelectedChildProfiles(d)
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

    const intent = buildAutoStartIntent({
      kidActivityStyle: d.kidActivityStyle,
      kidEnergyLevel: d.kidEnergyLevel,
    });

    const generatedActivities = await handleGenerateActivities("", {
      allowOfflineFallback: true,
      generationIntent: intent,
    });

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
    generationFailed,
    generationErrorMessage,
    setIsLoading,
    setLoadingIntent,
    beginGeneration,
    endGeneration,
    generateActivitiesRef,
    handleGenerateActivities,
    retryLastGeneration,
    handleGenerateKidActivities,
    handleStartSomethingForMe,
    startPresetActivity,
    handleStartActivityFromUi,
    handleAutoPickQuest,
    getBestActivityForCurrentMoment,
    ready: true,
  };
}
