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
import {
  buildActivitySessionExitPatch,
  buildActivitySessionPayload,
  buildActivitySessionStartPayload,
  buildCanceledHistoryItem,
  buildCompletedQuestSummary,
  buildFinishedHistoryItem,
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

  const [stepHint, setStepHint] = useState("");
  const [isHintLoading, setIsHintLoading] = useState(false);

  const timerSecondsRemaining = useActivityTimer(activeActivity);

  function patchActiveSessionExit(activity, completionStatus) {
    const sessionId = activity?.activitySessionId;
    if (!sessionId) {
      return;
    }

    const finishedAt = Date.now();
    void updateActivitySession(
      sessionId,
      buildActivitySessionExitPatch(activity, {
        completionStatus,
        finishedAt,
      }),
      { expectedUserId: userId }
    )
      .then((response) => {
        const session = response?.activitySession;
        if (session) {
          setActivitySessions((current) =>
            [session, ...current.filter((row) => row.id !== session.id)].slice(
              0,
              100
            )
          );
        }
      })
      .catch((error) => {
        console.error(
          `Could not update activity session (${completionStatus}):`,
          error
        );
      });
  }

  function handleStartActivity(activity) {
    const durationMinutes =
      Number(activity.estimatedMinutes) ||
      Number(currentMoment.timeNeededMinutes) ||
      20;

    const activityToStart = {
      id: crypto.randomUUID(),
      title: activity.title,
      activityStyle: normalizeActivityStyle(activity, kidActivityStyle),
      theme: activity.theme || "",
      summary: activity.summary || "",
      kidRole: activity.kidRole || "",
      mission: activity.mission || "",
      starterPrompts: Array.isArray(activity.starterPrompts)
        ? activity.starterPrompts
        : [],
      firstMoves: Array.isArray(activity.firstMoves) ? activity.firstMoves : [],
      roles: Array.isArray(activity.roles) ? activity.roles : [],
      steps: Array.isArray(activity.steps) ? activity.steps : [],
      extensionIdeas: Array.isArray(activity.extensionIdeas)
        ? activity.extensionIdeas
        : [],
      uses: Array.isArray(activity.uses) ? activity.uses : [],
      estimatedMinutes: Number(activity.estimatedMinutes) || durationMinutes,
      energy: activity.energy || "medium",
      mess: activity.mess || "low",
      adultHelp: activity.adultHelp || "optional",
      whyItFits: activity.whyItFits || "",
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
    saveActivityFeedback?.(activity, "started");
    showStatus?.(`Started: "${activity.title}". Timer is running.`, "success");

    const childIdForSession =
      activityMode === "family" ? "" : activeChildProfile?.id || "";

    void createActivitySession(
      buildActivitySessionStartPayload(activityToStart, currentMoment, {
        childId: childIdForSession,
      }),
      { expectedUserId: userId }
    )
      .then((response) => {
        const session = response?.activitySession;
        if (!session?.id) {
          return;
        }

        setActivitySessions((current) => [session, ...current].slice(0, 100));
        setActiveActivity((previous) => {
          if (!previous || previous.id !== activityToStart.id) {
            return previous;
          }
          return { ...previous, activitySessionId: session.id };
        });
      })
      .catch((error) => {
        console.error("Could not create activity session on start:", error);
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
    showStatus?.(`Finished: "${finishedActivity.title}". Nice work.`, "success");
    trackProductEvent("activity_finished", { title: finishedActivity.title });

    const sessionId = finishedActivity.activitySessionId;
    const exitPatch = buildActivitySessionExitPatch(finishedActivity, {
      completionStatus: "finished",
      finishedAt,
    });

    if (sessionId) {
      setLastCompletedQuest((previous) => {
        if (!previous || previous.id !== completedQuestSummary.id) {
          return previous;
        }
        return { ...previous, activitySessionId: sessionId };
      });

      void updateActivitySession(sessionId, exitPatch, {
        expectedUserId: userId,
      })
        .then((response) => {
          const session = response?.activitySession;
          if (session) {
            setActivitySessions((current) =>
              [session, ...current.filter((row) => row.id !== session.id)].slice(
                0,
                100
              )
            );
          }

          const pendingIndependenceRating =
            lastCompletedQuestRef.current?.id === completedQuestSummary.id
              ? lastCompletedQuestRef.current.independenceRating || null
              : null;

          if (pendingIndependenceRating) {
            void updateActivitySession(
              sessionId,
              { independenceRating: pendingIndependenceRating },
              { expectedUserId: userId }
            ).catch((error) => {
              console.error(
                "Could not update session independence rating:",
                error
              );
            });
          }
        })
        .catch((error) => {
          console.error("Could not update activity session on finish:", error);
        });
    } else {
      void createActivitySession(
        buildActivitySessionPayload(finishedActivity, currentMoment, {
          childId: activeChildProfile?.id || "",
          finishedAt,
          completionStatus: "finished",
        }),
        { expectedUserId: userId }
      )
        .then((response) => {
          const session = response?.activitySession;
          if (session) {
            setActivitySessions((current) =>
              [session, ...current].slice(0, 100)
            );
          }
          const createdId = session?.id;
          if (!createdId) {
            return;
          }
          setLastCompletedQuest((previous) => {
            if (!previous || previous.id !== completedQuestSummary.id) {
              return previous;
            }
            return { ...previous, activitySessionId: createdId };
          });
        })
        .catch((error) => {
          console.error("Could not create activity session on finish:", error);
        });
    }
  }

  function handleSessionOutcome(independenceRating) {
    if (!independenceRating) {
      return;
    }

    setLastCompletedQuest((previous) => {
      if (!previous) {
        return previous;
      }
      return { ...previous, independenceRating };
    });

    const sessionId = lastCompletedQuest?.activitySessionId;
    if (!sessionId) {
      return;
    }

    void updateActivitySession(
      sessionId,
      { independenceRating },
      { expectedUserId: userId }
    ).catch((error) => {
      console.error("Could not update session independence rating:", error);
    });
  }

  function cancelActiveActivity() {
    if (!activeActivity) {
      return;
    }

    appendHistory?.(
      buildCanceledHistoryItem(activeActivity, {
        kidMood,
        messLevel,
        locationPreference,
        childAgeRange: effectiveChildAgeRange,
      })
    );
    setLastCompletedQuest(null);
    patchActiveSessionExit(activeActivity, "canceled");
    setActiveActivity(null);
    setStepHint("");
    showStatus?.(`Canceled: "${activeActivity.title}".`, "info");
  }

  function handleTimerNotFinished() {
    if (!activeActivity) {
      return;
    }

    appendHistory?.({
      id: crypto.randomUUID(),
      title: activeActivity.title,
      activityStyle: normalizeActivityStyle(activeActivity),
      feedbackType: "not-finished",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    });
    patchActiveSessionExit(activeActivity, "not-finished");
    setActiveActivity(null);
    showStatus?.(
      `"${activeActivity.title}" was marked not finished. We'll use that to improve suggestions.`,
      "info"
    );
  }

  function handleTimerNeedAnotherIdea() {
    if (!activeActivity) {
      return;
    }

    const previousTitle = activeActivity.title;
    appendHistory?.({
      id: crypto.randomUUID(),
      title: previousTitle,
      activityStyle: normalizeActivityStyle(activeActivity),
      feedbackType: "need-another-idea",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    });
    patchActiveSessionExit(activeActivity, "abandoned");
    setActiveActivity(null);
    onNeedAnotherIdea?.(previousTitle);
  }

  function clearLastCompletedQuest() {
    setLastCompletedQuest(null);
  }

  function goToNextQuestStep() {
    if (!activeActivity) {
      return;
    }
    const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];
    if (steps.length === 0) {
      return;
    }
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;
    const lastStepIndex = steps.length - 1;
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

  async function handleNeedStepHint() {
    if (!activeActivity) {
      return;
    }

    const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];
    const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;
    const currentStep = steps[currentStepIndex];
    if (!currentStep) {
      return;
    }

    setIsHintLoading(true);
    setStepHint("");

    try {
      const hint = await getQuestStepHint({
        activityTitle: activeActivity.title,
        activityStyle: normalizeActivityStyle(activeActivity),
        currentStep,
        stepIndex: currentStepIndex,
        totalSteps: steps.length,
        kidRole: activeActivity.kidRole || "",
        mission: activeActivity.mission || "",
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
    handleNeedStepHint,
  };
}
