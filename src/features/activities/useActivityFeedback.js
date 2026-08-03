// src/features/activities/useActivityFeedback.js

import { normalizeActivityStyle } from "../../utils/activityStyle";
import {
  buildFeedbackIntent,
  intentToLegacyFeedbackContext,
} from "./activityIntent";

export function useActivityFeedback({
  kidMood,
  messLevel,
  locationPreference,
  effectiveChildAgeRange,
  activeChildProfile,
  activityMode,
  appendHistory,
  persistFavorite,
  removeFavorite,
  clearHistory,
  savedActivities,
  showStatus,
  navigate,
  handleGenerateActivities,
  handleStartActivity,
  activeActivity,
  setActiveActivity,
  lastCompletedQuest,
  clearLastCompletedQuest,
  kidActivityStyle,
  kidEnergyLevel,
} = {}) {
  function saveActivityFeedback(activity, feedbackType) {
    const historyItem = {
      id: crypto.randomUUID(),
      title: activity.title,
      feedbackType,
      createdAt: new Date().toISOString(),
      kidMood,
      childAgeRange: effectiveChildAgeRange,
      childId: activeChildProfile?.id || "",
      childName: activeChildProfile?.name || "",
      activityMode,
      activityStyle: normalizeActivityStyle(activity),
      theme: activity.theme || "",
      energy: activity.energy || "medium",
      mess: activity.mess || "low",
      adultHelp: activity.adultHelp || "optional",
      estimatedMinutes: Number(activity.estimatedMinutes) || null,
      uses: Array.isArray(activity.uses) ? activity.uses : [],
      stepsCount: Array.isArray(activity.steps) ? activity.steps.length : 0,
    };

    appendHistory?.(historyItem);
  }

  function regenerateFromFeedback(feedbackIntent, previousActivityTitle) {
    const intent = buildFeedbackIntent({
      feedbackIntent,
      previousActivityTitle,
      activityStyle: kidActivityStyle || "simple",
      energyLevel: kidEnergyLevel || kidMood || "neutral",
    });

    handleGenerateActivities?.(intentToLegacyFeedbackContext(intent), {
      generationIntent: intent,
    });
  }

  function saveFavoriteActivity(activity) {
    const alreadySaved = (savedActivities || []).some(
      (savedActivity) =>
        savedActivity.title.toLowerCase() === activity.title.toLowerCase()
    );

    if (alreadySaved) {
      showStatus?.(`"${activity.title}" is already saved.`, "error");
      return;
    }

    const favoriteActivity = {
      id: crypto.randomUUID(),
      title: activity.title,
      activityStyle: normalizeActivityStyle(activity),
      theme: activity.theme || "",
      summary: activity.summary || "",
      kidMission: activity.kidMission || "",
      kidRole: activity.kidRole || "",
      mission: activity.mission || "",
      starterPrompts: Array.isArray(activity.starterPrompts)
        ? activity.starterPrompts
        : [],
      firstMoves: Array.isArray(activity.firstMoves)
        ? activity.firstMoves
        : [],
      roles: Array.isArray(activity.roles) ? activity.roles : [],
      steps: Array.isArray(activity.steps) ? activity.steps : [],
      extensionIdeas: Array.isArray(activity.extensionIdeas)
        ? activity.extensionIdeas
        : [],
      uses: Array.isArray(activity.uses) ? activity.uses : [],
      estimatedMinutes: Number(activity.estimatedMinutes) || null,
      energy: activity.energy || "medium",
      mess: activity.mess || "low",
      adultHelp: activity.adultHelp || "optional",
      whyItFits: activity.whyItFits || "",
      savedAt: new Date().toISOString(),
    };

    showStatus?.(`Saving favorite: "${activity.title}"…`, "info");

    void Promise.resolve(persistFavorite?.(favoriteActivity)).then((result) => {
      if (result?.ok === false) {
        showStatus?.("Could not sync this favorite.", "error");
        return;
      }
      showStatus?.(`Saved favorite: "${activity.title}".`, "success");
    });
  }

  function removeSavedActivity(activityId) {
    void Promise.resolve(removeFavorite?.(activityId)).then((result) => {
      if (result?.ok === false) {
        showStatus?.("Could not sync this favorite.", "error");
        return;
      }
      showStatus?.("Saved activity removed.", "success");
    });
  }

  function handleReplaySavedActivity(savedActivity) {
    const activityToReplay = {
      ...savedActivity,
      activityStyle: normalizeActivityStyle(savedActivity),
    };

    handleStartActivity?.(activityToReplay);
    navigate?.("/quest");
    showStatus?.(
      `Replaying saved activity: "${savedActivity.title}".`,
      "success"
    );
  }

  function handleTimerMoreLikeThis() {
    if (!activeActivity) {
      return;
    }

    const previousTitle = activeActivity.title;

    appendHistory?.({
      id: crypto.randomUUID(),
      title: previousTitle,
      activityStyle: normalizeActivityStyle(activeActivity),
      feedbackType: "timer-more-like-this",
      createdAt: new Date().toISOString(),
      kidMood,
      messLevel,
      locationPreference,
      childAgeRange: effectiveChildAgeRange,
    });
    setActiveActivity?.(null);
    regenerateFromFeedback("timer-more-like-this", previousTitle);
  }

  function handleTooMessy(activity) {
    saveActivityFeedback(activity, "too-messy");
    regenerateFromFeedback("too-messy", activity.title);
  }

  function handleTooHard(activity) {
    saveActivityFeedback(activity, "too-hard");
    regenerateFromFeedback("too-hard", activity.title);
  }

  function handleNeedQuieter(activity) {
    saveActivityFeedback(activity, "need-quieter");
    regenerateFromFeedback("need-quieter", activity.title);
  }

  function handleMoreLikeThis(activity) {
    saveActivityFeedback(activity, "more-like-this");
    regenerateFromFeedback("more-like-this", activity.title);
  }

  function handleTryNextBest(scoredActivities = []) {
    const ranked = Array.isArray(scoredActivities) ? scoredActivities : [];
    if (ranked.length < 2) {
      showStatus?.("Need at least two ideas to try the next best one.", "info");
      return;
    }

    const rejected = ranked[0]?.activity;
    const nextBest = ranked[1]?.activity;

    if (!rejected || !nextBest) {
      showStatus?.("Could not find a next-best activity.", "error");
      return;
    }

    saveActivityFeedback(rejected, "activity_rejected");
    handleStartActivity?.(nextBest);
    showStatus?.(
      `Skipped "${rejected.title}". Starting next best: "${nextBest.title}".`,
      "success"
    );
  }

  function handleCompletedQuestMoreLikeThis() {
    if (!lastCompletedQuest?.activity) {
      showStatus?.("No completed activity to use yet.", "error");
      return;
    }

    const completedTitle = lastCompletedQuest.title;
    clearLastCompletedQuest?.();
    regenerateFromFeedback("more-like-this", completedTitle);
    navigate?.("/quest");
  }

  function handleCompletedQuestNeedAnotherIdea() {
    const completedTitle = lastCompletedQuest?.title || "the last activity";
    clearLastCompletedQuest?.();
    regenerateFromFeedback("need-another-idea", completedTitle);
    navigate?.("/quest");
  }

  function clearActivityHistory() {
    const confirmed = window.confirm(
      "Clear all activity history? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    void Promise.resolve(clearHistory?.()).then((result) => {
      if (result?.ok === false) {
        showStatus?.(
          "Could not clear synced activity history. Try again.",
          "error"
        );
        return;
      }
      showStatus?.("Activity history cleared.", "success");
    });
  }

  return {
    saveActivityFeedback,
    saveFavoriteActivity,
    removeSavedActivity,
    handleReplaySavedActivity,
    handleTimerMoreLikeThis,
    handleTooMessy,
    handleTooHard,
    handleNeedQuieter,
    handleMoreLikeThis,
    handleTryNextBest,
    handleCompletedQuestMoreLikeThis,
    handleCompletedQuestNeedAnotherIdea,
    clearActivityHistory,
  };
}
