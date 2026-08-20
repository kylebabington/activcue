// src/features/quest/useQuestSession.js

import { useRef, useState } from "react";
import { getQuestStepHint } from "../../api/activityApi";
import { ApiRequestError } from "../../api/apiClient";
import {
  createActivitySession,
  updateActivitySession,
} from "../../api/familyMemoryApi";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { normalizeActivityStyle } from "../../utils/activityStyle";
import { storyifyCachedImaginativeActivity } from "../demo/storyifyCachedImaginativeActivity";
import {
  activityNeedsSetup,
  getStepDetails,
  getStepStarterIdeas,
} from "../../utils/activityVisualTheme";
import { trackProductEvent } from "../../utils/analytics";
import { getSceneInstruction } from "../../utils/questStepCopy";
import {
  canRequestAiHint,
  getAiHintsForStep,
  getLocalStuckSuggestions,
  nextStuckSuggestion,
} from "../../utils/questStuckHelp";
import {
  markActivitySelectedAt,
  markActivityStartedAt,
  getTimeToStartTiming,
} from "../../utils/timeToStart";
import { recordSharedActivityOutcome } from "../../api/sharedActivitiesApi";
import { getDefaultOpenSections } from "../../components/quest/questSectionDefaults";
import {
  getYoungestPlayingAgeYears,
  resolveReadingMode,
} from "../../utils/readingMode";
import {
  buildActivitySessionExitPatch,
  buildActivitySessionStartPayload,
  buildCanceledHistoryItem,
  buildCompletedQuestSummary,
  buildFinishedHistoryItem,
  resolveActivitySessionId,
} from "./useQuest";

/*
 * Owns active quest state, step navigation, hints, and session PATCH lifecycle.
 * Countdown ticking lives in ActiveActivityPanel so App does not re-render at 1 Hz.
 */
export function useQuestSession({
  userId,
  currentMoment,
  activityMode,
  activeChildProfile,
  selectedChildProfiles = [],
  kidActivityStyle,
  kidMood,
  messLevel,
  locationPreference,
  effectiveChildAgeRange,
  appendHistory,
  setLastSuccessfulMoment,
  setActivitySessions,
  saveActivityFeedback,
  showStatus,
  onNeedAnotherIdea,
  readingModePreference = null,
  canUseAiHints = false,
} = {}) {
  const [activeActivity, setActiveActivity] = useLocalStorage(
    "activeActivity",
    null
  );
  const [lastCompletedQuest, setLastCompletedQuest] = useLocalStorage(
    "lastCompletedQuest",
    null
  );
  const lastCompletedQuestRef = useRef(lastCompletedQuest);
  lastCompletedQuestRef.current = lastCompletedQuest;

  // Serialize cloud session create → exit PATCH without blocking the UI.
  const sessionCreationPromiseRef = useRef(null);
  const sessionExitPromiseRef = useRef(null);

  const [stepHint, setStepHint] = useState("");
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [hintLoadingStepIndex, setHintLoadingStepIndex] = useState(null);

  function rememberSessionInList(session) {
    if (!session?.id) {
      return;
    }
    setActivitySessions((current) =>
      [session, ...current.filter((row) => row.id !== session.id)].slice(0, 100)
    );
  }

  function persistSessionExit(activity, completionStatus, {
    finishedAt = Date.now(),
    completedQuestSummaryId = null,
  } = {}) {
    const exitPatch = buildActivitySessionExitPatch(activity, {
      completionStatus,
      finishedAt,
    });

    const exitPromise = (async () => {
      const sessionId = await resolveActivitySessionId({
        existingSessionId: activity?.activitySessionId || null,
        creationPromise: sessionCreationPromiseRef.current,
      });

      sessionCreationPromiseRef.current = null;

      if (!sessionId) {
        console.error(
          `Could not resolve activity session id for ${completionStatus}; skipping exit PATCH.`
        );
        return null;
      }

      if (completedQuestSummaryId) {
        setLastCompletedQuest((previous) => {
          if (!previous || previous.id !== completedQuestSummaryId) {
            return previous;
          }
          return { ...previous, activitySessionId: sessionId };
        });
      }

      try {
        const response = await updateActivitySession(sessionId, exitPatch, {
          expectedUserId: userId,
        });
        const session = response?.activitySession;
        rememberSessionInList(session);

        const pendingIndependenceRating =
          completedQuestSummaryId &&
          lastCompletedQuestRef.current?.id === completedQuestSummaryId
            ? lastCompletedQuestRef.current.independenceRating || null
            : null;

        if (pendingIndependenceRating) {
          try {
            const rated = await updateActivitySession(
              sessionId,
              { independenceRating: pendingIndependenceRating },
              { expectedUserId: userId }
            );
            rememberSessionInList(rated?.activitySession);
          } catch (error) {
            console.error(
              "Could not update session independence rating:",
              error
            );
          }
        }

        return sessionId;
      } catch (error) {
        console.error(
          `Could not update activity session (${completionStatus}):`,
          error
        );
        return sessionId;
      }
    })();

    sessionExitPromiseRef.current = exitPromise;
    void exitPromise;
    return exitPromise;
  }

  function handleStartActivity(activity) {
    const enrichedActivity = storyifyCachedImaginativeActivity(activity);
    const durationMinutes =
      Number(enrichedActivity.estimatedMinutes) ||
      Number(currentMoment.timeNeededMinutes) ||
      20;

    const roles = Array.isArray(enrichedActivity.roles) ? enrichedActivity.roles : [];
    const playingChildren =
      activityMode === "family"
        ? selectedChildProfiles
        : activeChildProfile
          ? [activeChildProfile]
          : [];

    const readingMode = {
      ...resolveReadingMode({
        preference: readingModePreference,
        youngestAgeYears: getYoungestPlayingAgeYears(playingChildren),
      }),
      // Start always lands on the full play board. Listening Mode is a
      // toggle after the activity is already open.
      enabled: false,
    };

    const needsSetup = activityNeedsSetup(enrichedActivity);

    const activityToStart = {
      id: crypto.randomUUID(),
      title: enrichedActivity.title,
      activityStyle: normalizeActivityStyle(enrichedActivity, kidActivityStyle),
      activityFormatVersion: enrichedActivity.activityFormatVersion || 2,
      visualTheme: enrichedActivity.visualTheme || "",
      theme: enrichedActivity.theme || "",
      story: enrichedActivity.story || "",
      summary: enrichedActivity.summary || "",
      setupGuide:
        enrichedActivity.setupGuide && typeof enrichedActivity.setupGuide === "object"
          ? enrichedActivity.setupGuide
          : null,
      finishGuide:
        enrichedActivity.finishGuide && typeof enrichedActivity.finishGuide === "object"
          ? enrichedActivity.finishGuide
          : null,
      kidRole: enrichedActivity.kidRole || "",
      mission: enrichedActivity.mission || "",
      roleGuide:
        enrichedActivity.roleGuide && typeof enrichedActivity.roleGuide === "object"
          ? enrichedActivity.roleGuide
          : null,
      ageFit:
        enrichedActivity.ageFit && typeof enrichedActivity.ageFit === "object"
          ? enrichedActivity.ageFit
          : null,
      starterIdeas: Array.isArray(enrichedActivity.starterIdeas)
        ? enrichedActivity.starterIdeas
        : [],
      starterPrompts: Array.isArray(enrichedActivity.starterPrompts)
        ? enrichedActivity.starterPrompts
        : [],
      firstMoves: Array.isArray(enrichedActivity.firstMoves) ? enrichedActivity.firstMoves : [],
      stepDetails: Array.isArray(enrichedActivity.stepDetails)
        ? enrichedActivity.stepDetails
        : [],
      roles,
      steps: Array.isArray(enrichedActivity.steps) ? enrichedActivity.steps : [],
      extensionIdeas: Array.isArray(enrichedActivity.extensionIdeas)
        ? enrichedActivity.extensionIdeas
        : [],
      uses: Array.isArray(enrichedActivity.uses) ? enrichedActivity.uses : [],
      categories: Array.isArray(enrichedActivity.categories) ? enrichedActivity.categories : [],
      traits:
        enrichedActivity.traits && typeof enrichedActivity.traits === "object"
          ? enrichedActivity.traits
          : {},
      estimatedMinutes: Number(enrichedActivity.estimatedMinutes) || durationMinutes,
      energy: enrichedActivity.energy || "medium",
      mess: enrichedActivity.mess || "low",
      adultHelp: enrichedActivity.adultHelp || "optional",
      whyItFits: enrichedActivity.whyItFits || "",
      candidateId: enrichedActivity.candidateId || enrichedActivity.candidate_id || null,
      recommendationBatchId:
        enrichedActivity.recommendationBatchId ||
        enrichedActivity.recommendation_batch_id ||
        null,
      momentId:
        enrichedActivity.momentId ||
        enrichedActivity.moment_id ||
        getTimeToStartTiming()?.momentId ||
        null,
      presentedAt: enrichedActivity.presentedAt || enrichedActivity.presented_at || null,
      ...(enrichedActivity.storyVoiceVersion
        ? { storyVoiceVersion: enrichedActivity.storyVoiceVersion }
        : {}),
      selectedAt: new Date().toISOString(),
      questPhase: needsSetup ? "setup" : "playing",
      setupComplete: !needsSetup,
      setupCollapsed: false,
      checkedStarterIndexes: [],
      selectedStepStarterByIndex: {},
      selectedRoleName:
        enrichedActivity.roleGuide?.name || enrichedActivity.kidRole || roles[0] || "",
      roleAssignments: Object.fromEntries(
        playingChildren
          .filter((child) => child?.id)
          .map((child, index) => {
            const fromChildRoles = Array.isArray(enrichedActivity.roleGuide?.childRoles)
              ? enrichedActivity.roleGuide.childRoles.find(
                  (role) =>
                    String(role.childName || "").toLowerCase() ===
                    String(child.name || "").toLowerCase()
                )?.roleTitle
              : null;
            return [
              child.id,
              fromChildRoles ||
                roles[index] ||
                roles[0] ||
                enrichedActivity.roleGuide?.name ||
                "",
            ];
          })
      ),
      showBuiltInHelp: false,
      showAiHintPanel: false,
      currentStepIndex: 0,
      completedStepIndexes: [],
      showAllSteps: !readingMode.enabled,
      readingMode,
      listeningIntroComplete: false,
      openSections: getDefaultOpenSections({
        mission: true,
        role: true,
        starters: true,
        materials: false,
        steps: true,
        rescue: false,
        finish: false,
      }),
      usedRescueMode: false,
      highlightedStuckStepIndex: null,
      startedAt: needsSetup ? null : Date.now(),
      durationMinutes,
      activitySessionId: null,
    };

    const timingIds = {
      candidateId: activityToStart.candidateId,
      recommendationBatchId: activityToStart.recommendationBatchId,
      momentId: activityToStart.momentId,
    };

    setStepHint("");
    setHintLoadingStepIndex(null);
    setLastCompletedQuest(null);
    setActiveActivity(activityToStart);
    markActivitySelectedAt(activityToStart.selectedAt, timingIds);
    if (!needsSetup) {
      markActivityStartedAt(undefined, timingIds);
    }
    saveActivityFeedback?.(enrichedActivity, "started");
    if (activityToStart.candidateId) {
      void recordSharedActivityOutcome({
        candidateId: activityToStart.candidateId,
        outcome: "started",
      }).catch((error) => {
        console.warn("Could not record shared candidate start:", error);
      });
    }
    showStatus?.(
      needsSetup
        ? `Started: "${enrichedActivity.title}". Set up first, then press Ready.`
        : `Started: "${enrichedActivity.title}". Timer is running.`,
      "success"
    );

    if (needsSetup) {
      trackProductEvent("activity_setup_viewed", {
        title: activityToStart.title,
        activityFormatVersion: activityToStart.activityFormatVersion,
      });
    } else {
      trackProductEvent("activity_scene_started", {
        title: activityToStart.title,
        stepIndex: 0,
        activityFormatVersion: activityToStart.activityFormatVersion,
      });
    }

    const playingChildIds = (
      activityMode === "family"
        ? selectedChildProfiles
        : activeChildProfile
          ? [activeChildProfile]
          : []
    )
      .map((child) => child?.id)
      .filter(Boolean);

    const childIdForSession =
      activityMode === "family" ? "" : activeChildProfile?.id || "";

    const creationPromise = createActivitySession(
      buildActivitySessionStartPayload(activityToStart, currentMoment, {
        childId: childIdForSession,
        sessionScope:
          playingChildIds.length > 1 || activityMode === "family"
            ? "group"
            : "single",
        participantChildIds: playingChildIds,
      }),
      { expectedUserId: userId }
    )
      .then((response) => {
        const session = response?.activitySession;
        if (session?.id) {
          rememberSessionInList(session);
          setActiveActivity((previous) => {
            if (!previous || previous.id !== activityToStart.id) {
              return previous;
            }
            return { ...previous, activitySessionId: session.id };
          });
        }
        return response;
      })
      .catch((error) => {
        console.error("Could not create activity session on start:", error);
        throw error;
      });

    sessionCreationPromiseRef.current = creationPromise;
    sessionExitPromiseRef.current = null;
  }

  function completeSetup() {
    if (!activeActivity || activeActivity.setupComplete) {
      return;
    }

    trackProductEvent("activity_setup_completed", {
      title: activeActivity.title,
      activityFormatVersion: activeActivity.activityFormatVersion || 2,
    });

    setActiveActivity({
      ...activeActivity,
      questPhase: "playing",
      setupComplete: true,
      setupCollapsed: true,
      startedAt: Date.now(),
    });

    const timingIds = {
      candidateId: activeActivity.candidateId,
      recommendationBatchId: activeActivity.recommendationBatchId,
      momentId: activeActivity.momentId,
    };
    markActivityStartedAt(undefined, timingIds);
    trackProductEvent("activity_scene_started", {
      title: activeActivity.title,
      stepIndex: 0,
      activityFormatVersion: activeActivity.activityFormatVersion || 2,
    });
    trackProductEvent("first_step_started", {
      title: activeActivity.title,
      activityFormatVersion: activeActivity.activityFormatVersion || 2,
    });
    showStatus?.(`Ready! Timer is running for "${activeActivity.title}".`, "success");
  }

  function toggleSetupCollapsed() {
    if (!activeActivity) return;
    setActiveActivity({
      ...activeActivity,
      setupCollapsed: !activeActivity.setupCollapsed,
    });
  }

  function finishActiveActivity() {
    if (!activeActivity) {
      return;
    }

    const finishedAt = Date.now();
    const finishedActivity = activeActivity;
    const completedQuestSummary = buildCompletedQuestSummary(finishedActivity, {
      finishedAt,
    });
    const finishedHistoryItem = buildFinishedHistoryItem(finishedActivity, {
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
      childId: activeChildProfile?.id || "",
      childName: activeChildProfile?.name || "",
      activityMode,
    });

    appendHistory?.(finishedHistoryItem);
    setLastSuccessfulMoment?.({
      parentActivity: currentMoment.parentActivity,
      availability: currentMoment.availability,
      timeNeededMinutes: currentMoment.timeNeededMinutes,
      space: currentMoment.space,
      messLevel: currentMoment.messLevel,
      noiseLevel: currentMoment.noiseLevel,
      supervisionLevel: currentMoment.supervisionLevel,
      completedAt: new Date(finishedAt).toISOString(),
      activityTitle: finishedActivity.title,
    });
    setLastCompletedQuest(completedQuestSummary);
    setActiveActivity(null);
    setStepHint("");
    setHintLoadingStepIndex(null);
    showStatus?.(`Finished: "${finishedActivity.title}". Nice work.`, "success");
    trackProductEvent("activity_finished", {
      title: finishedActivity.title,
      activityFormatVersion: finishedActivity.activityFormatVersion || 2,
      candidateId: finishedActivity.candidateId || null,
      recommendationBatchId: finishedActivity.recommendationBatchId || null,
      momentId: finishedActivity.momentId || null,
    });
    trackProductEvent("activity_completed", {
      activityFormatVersion: finishedActivity.activityFormatVersion || 2,
      candidateId: finishedActivity.candidateId || null,
      recommendationBatchId: finishedActivity.recommendationBatchId || null,
      momentId: finishedActivity.momentId || null,
    });
    if (finishedActivity.candidateId) {
      void recordSharedActivityOutcome({
        candidateId: finishedActivity.candidateId,
        outcome: "completed",
      }).catch((error) => {
        console.warn("Could not record shared candidate complete:", error);
      });
    }

    persistSessionExit(finishedActivity, "finished", {
      finishedAt,
      completedQuestSummaryId: completedQuestSummary.id,
    });
  }

  function handleSessionOutcome(independenceRating) {
    if (!independenceRating) {
      return;
    }

    trackProductEvent("independence_outcome", {
      independenceRating,
    });

    setLastCompletedQuest((previous) => {
      if (!previous) {
        return previous;
      }
      return { ...previous, independenceRating };
    });

    void (async () => {
      let sessionId = lastCompletedQuestRef.current?.activitySessionId || null;

      if (!sessionId && sessionExitPromiseRef.current) {
        sessionId = await sessionExitPromiseRef.current;
      }

      if (!sessionId && sessionCreationPromiseRef.current) {
        sessionId = await resolveActivitySessionId({
          creationPromise: sessionCreationPromiseRef.current,
        });
      }

      if (!sessionId) {
        return;
      }

      try {
        const response = await updateActivitySession(
          sessionId,
          { independenceRating },
          { expectedUserId: userId }
        );
        rememberSessionInList(response?.activitySession);
      } catch (error) {
        console.error("Could not update session independence rating:", error);
      }
    })();
  }

  function cancelActiveActivity() {
    if (!activeActivity) {
      return;
    }

    const canceledActivity = activeActivity;
    appendHistory?.(
      buildCanceledHistoryItem(canceledActivity, {
        kidMood,
        messLevel,
        locationPreference,
        childAgeRange: effectiveChildAgeRange,
      })
    );
    setLastCompletedQuest(null);
    setActiveActivity(null);
    setStepHint("");
    setHintLoadingStepIndex(null);
    showStatus?.(`Canceled: "${canceledActivity.title}".`, "info");
    trackProductEvent("activity_abandoned", {
      reason: "canceled",
      candidateId: canceledActivity.candidateId || null,
      recommendationBatchId: canceledActivity.recommendationBatchId || null,
      momentId: canceledActivity.momentId || null,
    });
    if (canceledActivity.candidateId) {
      void recordSharedActivityOutcome({
        candidateId: canceledActivity.candidateId,
        outcome: "rejected",
      }).catch(() => {});
    }
    persistSessionExit(canceledActivity, "canceled");
  }

  function handleTimerNotFinished() {
    if (!activeActivity) {
      return;
    }

    const activity = activeActivity;
    appendHistory?.({
      id: crypto.randomUUID(),
      title: activity.title,
      activityStyle: normalizeActivityStyle(activity),
      feedbackType: "not-finished",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    });
    setActiveActivity(null);
    showStatus?.(
      `"${activity.title}" was marked not finished. We'll use that to improve suggestions.`,
      "info"
    );
    persistSessionExit(activity, "not-finished");
  }

  function handleTimerNeedAnotherIdea() {
    if (!activeActivity) {
      return;
    }

    const previousTitle = activeActivity.title;
    const activity = activeActivity;
    appendHistory?.({
      id: crypto.randomUUID(),
      title: previousTitle,
      activityStyle: normalizeActivityStyle(activity),
      feedbackType: "need-another-idea",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
      candidateId: activity.candidateId || activity.candidate_id || null,
      recommendationBatchId:
        activity.recommendationBatchId ||
        activity.recommendation_batch_id ||
        null,
    });
    setActiveActivity(null);
    persistSessionExit(activity, "abandoned");
    trackProductEvent("activity_abandoned", {
      reason: "need-another-idea",
      candidateId: activity.candidateId || null,
      recommendationBatchId: activity.recommendationBatchId || null,
      momentId: activity.momentId || null,
    });
    trackProductEvent("activity_rejected", {
      reason: "need-another-idea",
      candidateId: activity.candidateId || null,
      recommendationBatchId: activity.recommendationBatchId || null,
    });
    if (activity.candidateId) {
      void recordSharedActivityOutcome({
        candidateId: activity.candidateId,
        outcome: "rejected",
      }).catch(() => {});
    }
    onNeedAnotherIdea?.(previousTitle, {
      excludeCandidateIds: activity.candidateId
        ? [String(activity.candidateId)]
        : [],
    });
  }

  function clearLastCompletedQuest() {
    setLastCompletedQuest(null);
  }

  function goToNextQuestStep() {
    if (!activeActivity) {
      return;
    }
    const stepDetails = Array.isArray(activeActivity.stepDetails)
      ? activeActivity.stepDetails
      : [];
    const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];
    const totalSteps = stepDetails.length || steps.length;
    if (totalSteps === 0) {
      return;
    }
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;
    const lastStepIndex = totalSteps - 1;
    const nextStepIndex = Math.min(currentStepIndex + 1, lastStepIndex);
    const completedStepIndexes = Array.isArray(activeActivity.completedStepIndexes)
      ? activeActivity.completedStepIndexes
      : [];
    const updatedCompletedStepIndexes = completedStepIndexes.includes(
      currentStepIndex
    )
      ? completedStepIndexes
      : [...completedStepIndexes, currentStepIndex];

    setStepHint("");
    setHintLoadingStepIndex(null);
    setActiveActivity({
      ...activeActivity,
      currentStepIndex: nextStepIndex,
      completedStepIndexes: updatedCompletedStepIndexes,
      showBuiltInHelp: false,
      showAiHintPanel: false,
    });
    trackProductEvent("step_completed", {
      title: activeActivity.title,
      stepIndex: currentStepIndex,
    });
  }

  function goToPreviousQuestStep() {
    if (!activeActivity) {
      return;
    }
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;
    setStepHint("");
    setHintLoadingStepIndex(null);
    setActiveActivity({
      ...activeActivity,
      currentStepIndex: Math.max(currentStepIndex - 1, 0),
      showBuiltInHelp: false,
      showAiHintPanel: false,
    });
  }

  function toggleQuestStepComplete(stepIndexToToggle) {
    if (!activeActivity) {
      return;
    }
    const completedStepIndexes = Array.isArray(activeActivity.completedStepIndexes)
      ? activeActivity.completedStepIndexes
      : [];
    const stepIsAlreadyComplete =
      completedStepIndexes.includes(stepIndexToToggle);
    setActiveActivity({
      ...activeActivity,
      completedStepIndexes: stepIsAlreadyComplete
        ? completedStepIndexes.filter((index) => index !== stepIndexToToggle)
        : [...completedStepIndexes, stepIndexToToggle],
    });
    if (!stepIsAlreadyComplete) {
      trackProductEvent("step_completed", {
        title: activeActivity.title,
        stepIndex: stepIndexToToggle,
        activityFormatVersion: activeActivity.activityFormatVersion || 2,
      });
      trackProductEvent("activity_scene_completed", {
        title: activeActivity.title,
        stepIndex: stepIndexToToggle,
        activityFormatVersion: activeActivity.activityFormatVersion || 2,
      });
    }
  }

  function toggleShowAllQuestSteps() {
    if (!activeActivity) {
      return;
    }
    setActiveActivity({
      ...activeActivity,
      showAllSteps: !activeActivity.showAllSteps,
    });
  }

  function completeListeningIntro() {
    if (!activeActivity) {
      return;
    }
    setActiveActivity({
      ...activeActivity,
      listeningIntroComplete: true,
      currentStepIndex: 0,
    });
  }

  function setActivityReadingModeEnabled(enabled) {
    if (!activeActivity) {
      return;
    }
    const nextEnabled = Boolean(enabled);
    setActiveActivity({
      ...activeActivity,
      readingMode: {
        ...(activeActivity.readingMode || {}),
        enabled: nextEnabled,
      },
      showAllSteps: !nextEnabled,
      listeningIntroComplete: nextEnabled
        ? Boolean(activeActivity.listeningIntroComplete)
        : true,
    });
  }

  function setQuestPhase(questPhase) {
    if (!activeActivity) {
      return;
    }
    setActiveActivity({
      ...activeActivity,
      questPhase,
      showBuiltInHelp: false,
      showAiHintPanel: false,
    });
    setStepHint("");
    setHintLoadingStepIndex(null);
    if (questPhase === "playing") {
      trackProductEvent("first_step_started", {
        title: activeActivity.title,
      });
    }
    if (questPhase === "starters") {
      trackProductEvent("starter_idea_opened", {
        title: activeActivity.title,
      });
    }
  }

  function toggleStarterIdea(index) {
    if (!activeActivity) {
      return;
    }
    const checked = Array.isArray(activeActivity.checkedStarterIndexes)
      ? activeActivity.checkedStarterIndexes
      : [];
    const next = checked.includes(index)
      ? checked.filter((value) => value !== index)
      : [...checked, index];
    setActiveActivity({
      ...activeActivity,
      checkedStarterIndexes: next,
    });
    if (!checked.includes(index)) {
      trackProductEvent("starter_idea_opened", {
        title: activeActivity.title,
        starterIndex: index,
      });
    }
  }

  function selectStepStarter(stepIndex, starterIndex) {
    if (!activeActivity) {
      return;
    }
    const current =
      activeActivity.selectedStepStarterByIndex &&
      typeof activeActivity.selectedStepStarterByIndex === "object"
        ? { ...activeActivity.selectedStepStarterByIndex }
        : {};
    const key = String(stepIndex);
    const previous = current[key];
    if (previous === starterIndex) {
      delete current[key];
    } else {
      current[key] = starterIndex;
      trackProductEvent("step_starter_selected", {
        title: activeActivity.title,
        stepIndex,
        starterIndex,
      });
    }
    setActiveActivity({
      ...activeActivity,
      selectedStepStarterByIndex: current,
    });
  }

  function assignRole(childId, roleName) {
    if (!activeActivity || !childId) {
      return;
    }
    setActiveActivity({
      ...activeActivity,
      selectedRoleName: roleName,
      roleAssignments: {
        ...(activeActivity.roleAssignments || {}),
        [childId]: roleName,
      },
    });
  }

  function toggleBuiltInHelp() {
    if (!activeActivity) {
      return;
    }
    setActiveActivity({
      ...activeActivity,
      showBuiltInHelp: !activeActivity.showBuiltInHelp,
      showAiHintPanel: false,
    });
    if (!activeActivity.showBuiltInHelp) {
      trackProductEvent("built_in_help_opened", {
        title: activeActivity.title,
      });
    }
  }

  function setOpenSection(sectionKey, nextOpen) {
    if (!activeActivity || !sectionKey) {
      return;
    }
    const current =
      activeActivity.openSections || getDefaultOpenSections();
    setActiveActivity({
      ...activeActivity,
      openSections: {
        ...current,
        [sectionKey]: Boolean(nextOpen),
      },
    });
  }

  function markRescueModeUsed() {
    if (!activeActivity) {
      return;
    }
    setActiveActivity({
      ...activeActivity,
      usedRescueMode: true,
    });
    trackProductEvent("rescue_mode_opened", {
      title: activeActivity.title,
    });
  }

  function openRescueSection(stepIndex = null) {
    if (!activeActivity) {
      return;
    }
    const current =
      activeActivity.openSections || getDefaultOpenSections();
    setActiveActivity({
      ...activeActivity,
      usedRescueMode: true,
      highlightedStuckStepIndex:
        typeof stepIndex === "number" ? stepIndex : null,
      openSections: {
        ...current,
        rescue: true,
        steps: true,
      },
      showBuiltInHelp: true,
    });
    trackProductEvent("built_in_help_opened", {
      title: activeActivity.title,
      stepIndex,
    });
  }

  async function handleNeedStepHint(stepIndex) {
    if (!activeActivity || isHintLoading) {
      return;
    }

    const steps = getStepDetails(activeActivity);
    const completed = Array.isArray(activeActivity.completedStepIndexes)
      ? activeActivity.completedStepIndexes
      : [];
    const firstIncomplete = steps.findIndex(
      (_, index) => !completed.includes(index)
    );
    const resolvedIndex = Number.isInteger(stepIndex)
      ? stepIndex
      : Number.isInteger(Number(activeActivity.currentStepIndex))
        ? Number(activeActivity.currentStepIndex)
        : firstIncomplete >= 0
          ? firstIncomplete
          : 0;
    const step = steps[resolvedIndex];
    const instruction =
      getSceneInstruction(step) ||
      String(step?.title || "").trim() ||
      String(
        Array.isArray(activeActivity.steps)
          ? activeActivity.steps[resolvedIndex]
          : ""
      ).trim();
    if (!step && !instruction) {
      return;
    }

    const stepKey = String(resolvedIndex);
    const aiHintsByStepIndex =
      activeActivity.aiHintsByStepIndex &&
      typeof activeActivity.aiHintsByStepIndex === "object"
        ? activeActivity.aiHintsByStepIndex
        : {};
    const existingAi = getAiHintsForStep(aiHintsByStepIndex, resolvedIndex);
    const wantAi =
      Boolean(canUseAiHints) &&
      canRequestAiHint(aiHintsByStepIndex, resolvedIndex);

    function applyCycledSuggestion() {
      const local = getLocalStuckSuggestions(step);
      const pool = [...existingAi, ...local];
      const fallback = instruction
        ? `Try this part next: ${instruction}`
        : "Look at this scene and do one small part you can see.";
      const storedCursor = Number(
        activeActivity.stuckCursorByStepIndex?.[stepKey]
      );
      const next = nextStuckSuggestion(
        pool.length > 0 ? pool : [fallback],
        Number.isInteger(storedCursor) ? storedCursor : -1
      );
      setStepHint(next.suggestion);
      setActiveActivity((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          showAiHintPanel: true,
          stuckCursorByStepIndex: {
            ...(previous.stuckCursorByStepIndex || {}),
            [stepKey]: next.cursor,
          },
          stuckSuggestionByStepIndex: {
            ...(previous.stuckSuggestionByStepIndex || {}),
            [stepKey]: next.suggestion,
          },
        };
      });
    }

    if (wantAi) {
      setActiveActivity((previous) =>
        previous ? { ...previous, showAiHintPanel: true } : previous
      );
      setIsHintLoading(true);
      setHintLoadingStepIndex(resolvedIndex);
      trackProductEvent("ai_hint_requested", {
        title: activeActivity.title,
        stepIndex: resolvedIndex,
      });

      try {
        const hint = await getQuestStepHint({
          activeActivity: {
            title: activeActivity.title,
            theme: activeActivity.theme || "",
            mission: activeActivity.mission || "",
            uses: activeActivity.uses || [],
            kidRole: activeActivity.kidRole || "",
            activityStyle: normalizeActivityStyle(activeActivity),
          },
          currentStep: instruction,
          currentStepTitle: step?.title || "",
          currentStepInstruction: instruction,
          currentStepNumber: resolvedIndex + 1,
          totalSteps: steps.length,
          starterIdeas: getStepStarterIdeas(step),
          previousHints: existingAi,
          currentMoment,
          activeChildProfile,
        });
        const text = String(hint?.hint || hint?.message || hint || "").trim();
        if (text) {
          setStepHint(text);
          setActiveActivity((previous) => {
            if (!previous) return previous;
            const prevHints =
              previous.aiHintsByStepIndex &&
              typeof previous.aiHintsByStepIndex === "object"
                ? previous.aiHintsByStepIndex
                : {};
            const prevForStep = getAiHintsForStep(prevHints, resolvedIndex);
            return {
              ...previous,
              showAiHintPanel: true,
              aiHintsByStepIndex: {
                ...prevHints,
                [stepKey]: [...prevForStep, text],
              },
              stuckSuggestionByStepIndex: {
                ...(previous.stuckSuggestionByStepIndex || {}),
                [stepKey]: text,
              },
            };
          });
          return;
        }
      } catch (error) {
        if (error instanceof ApiRequestError) {
          showStatus?.(error.message, "error");
        } else {
          showStatus?.("Could not get a hint right now.", "error");
        }
      } finally {
        setIsHintLoading(false);
        setHintLoadingStepIndex(null);
      }
    }

    applyCycledSuggestion();
  }

  return {
    activeActivity,
    setActiveActivity,
    lastCompletedQuest,
    setLastCompletedQuest,
    clearLastCompletedQuest,
    stepHint,
    isHintLoading,
    hintLoadingStepIndex,
    handleStartActivity,
    completeSetup,
    toggleSetupCollapsed,
    finishActiveActivity,
    cancelActiveActivity,
    handleTimerNotFinished,
    handleTimerNeedAnotherIdea,
    handleSessionOutcome,
    goToNextQuestStep,
    goToPreviousQuestStep,
    toggleQuestStepComplete,
    toggleShowAllQuestSteps,
    completeListeningIntro,
    setActivityReadingModeEnabled,
    setQuestPhase,
    toggleStarterIdea,
    selectStepStarter,
    assignRole,
    toggleBuiltInHelp,
    setOpenSection,
    openRescueSection,
    markRescueModeUsed,
    handleNeedStepHint,
  };
}
