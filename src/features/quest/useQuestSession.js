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
import { trackProductEvent } from "../../utils/analytics";
import { markActivityStartedAt } from "../../utils/timeToStart";
import {
  buildActivitySessionExitPatch,
  buildActivitySessionStartPayload,
  buildCanceledHistoryItem,
  buildCompletedQuestSummary,
  buildFinishedHistoryItem,
  resolveActivitySessionId,
  useActivityTimer,
} from "./useQuest";

/*
 * Owns active quest state, timer, step navigation, hints, and session PATCH lifecycle.
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

  const timerSecondsRemaining = useActivityTimer(activeActivity);

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
    const durationMinutes =
      Number(activity.estimatedMinutes) ||
      Number(currentMoment.timeNeededMinutes) ||
      20;

    const roles = Array.isArray(activity.roles) ? activity.roles : [];
    const playingChildren =
      activityMode === "family"
        ? selectedChildProfiles
        : activeChildProfile
          ? [activeChildProfile]
          : [];

    const activityToStart = {
      id: crypto.randomUUID(),
      title: activity.title,
      activityStyle: normalizeActivityStyle(activity, kidActivityStyle),
      activityFormatVersion: activity.activityFormatVersion || 2,
      visualTheme: activity.visualTheme || "",
      theme: activity.theme || "",
      summary: activity.summary || "",
      kidRole: activity.kidRole || "",
      mission: activity.mission || "",
      roleGuide:
        activity.roleGuide && typeof activity.roleGuide === "object"
          ? activity.roleGuide
          : null,
      starterIdeas: Array.isArray(activity.starterIdeas)
        ? activity.starterIdeas
        : [],
      starterPrompts: Array.isArray(activity.starterPrompts)
        ? activity.starterPrompts
        : [],
      firstMoves: Array.isArray(activity.firstMoves) ? activity.firstMoves : [],
      stepDetails: Array.isArray(activity.stepDetails)
        ? activity.stepDetails
        : [],
      roles,
      steps: Array.isArray(activity.steps) ? activity.steps : [],
      extensionIdeas: Array.isArray(activity.extensionIdeas)
        ? activity.extensionIdeas
        : [],
      uses: Array.isArray(activity.uses) ? activity.uses : [],
      categories: Array.isArray(activity.categories) ? activity.categories : [],
      traits:
        activity.traits && typeof activity.traits === "object"
          ? activity.traits
          : {},
      estimatedMinutes: Number(activity.estimatedMinutes) || durationMinutes,
      energy: activity.energy || "medium",
      mess: activity.mess || "low",
      adultHelp: activity.adultHelp || "optional",
      whyItFits: activity.whyItFits || "",
      candidateId: activity.candidateId || activity.candidate_id || null,
      recommendationBatchId:
        activity.recommendationBatchId ||
        activity.recommendation_batch_id ||
        null,
      questPhase: "world",
      checkedStarterIndexes: [],
      selectedRoleName:
        activity.roleGuide?.name || activity.kidRole || roles[0] || "",
      roleAssignments: Object.fromEntries(
        playingChildren
          .filter((child) => child?.id)
          .map((child, index) => [
            child.id,
            roles[index] || roles[0] || activity.roleGuide?.name || "",
          ])
      ),
      showBuiltInHelp: false,
      showAiHintPanel: false,
      currentStepIndex: 0,
      completedStepIndexes: [],
      showAllSteps: false,
      startedAt: Date.now(),
      durationMinutes,
      activitySessionId: null,
    };

    setStepHint("");
    setLastCompletedQuest(null);
    setActiveActivity(activityToStart);
    markActivityStartedAt();
    saveActivityFeedback?.(activity, "started");
    showStatus?.(`Started: "${activity.title}". Timer is running.`, "success");

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
    showStatus?.(`Finished: "${finishedActivity.title}". Nice work.`, "success");
    trackProductEvent("activity_finished", { title: finishedActivity.title });

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
    showStatus?.(`Canceled: "${canceledActivity.title}".`, "info");
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
    });
    setActiveActivity(null);
    persistSessionExit(activity, "abandoned");
    onNeedAnotherIdea?.(previousTitle);
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

  async function handleNeedStepHint() {
    if (!activeActivity) {
      return;
    }

    const stepDetails = Array.isArray(activeActivity.stepDetails)
      ? activeActivity.stepDetails
      : [];
    const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;
    const detail = stepDetails[currentStepIndex];
    const currentStep =
      detail?.instruction ||
      detail?.title ||
      steps[currentStepIndex];
    if (!currentStep) {
      return;
    }

    setActiveActivity({
      ...activeActivity,
      showAiHintPanel: true,
    });
    setIsHintLoading(true);
    setStepHint("");
    trackProductEvent("ai_hint_requested", {
      title: activeActivity.title,
      stepIndex: currentStepIndex,
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
        currentStep,
        currentStepNumber: currentStepIndex + 1,
        totalSteps: stepDetails.length || steps.length,
        currentMoment,
        activeChildProfile,
      });
      setStepHint(hint?.hint || hint?.message || String(hint || ""));
    } catch (error) {
      if (error instanceof ApiRequestError) {
        showStatus?.(error.message, "error");
      } else {
        showStatus?.("Could not get a hint right now.", "error");
      }
    } finally {
      setIsHintLoading(false);
    }
  }

  return {
    activeActivity,
    setActiveActivity,
    lastCompletedQuest,
    setLastCompletedQuest,
    clearLastCompletedQuest,
    stepHint,
    isHintLoading,
    timerSecondsRemaining,
    handleStartActivity,
    finishActiveActivity,
    cancelActiveActivity,
    handleTimerNotFinished,
    handleTimerNeedAnotherIdea,
    handleSessionOutcome,
    goToNextQuestStep,
    goToPreviousQuestStep,
    toggleQuestStepComplete,
    toggleShowAllQuestSteps,
    setQuestPhase,
    toggleStarterIdea,
    assignRole,
    toggleBuiltInHelp,
    handleNeedStepHint,
  };
}
