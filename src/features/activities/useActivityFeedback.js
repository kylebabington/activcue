// src/features/activities/useActivityFeedback.js

import { normalizeActivityStyle } from "../../utils/activityStyle";

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

    void persistFavorite?.(favoriteActivity);
    showStatus?.(`Saved favorite: "${activity.title}".`, "success");
  }

  function removeSavedActivity(activityId) {
    void removeFavorite?.(activityId);
    showStatus?.("Saved activity removed.", "success");
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

    handleGenerateActivities?.(
      `The child finished or liked "${previousTitle}". Suggest 3 more activities with a similar feeling, but do not repeat it.`
    );
  }

  function handleTooMessy(activity) {
    saveActivityFeedback(activity, "too-messy");
    handleGenerateActivities?.(
      `The activity "${activity.title}" was too messy. Suggest lower-mess alternatives.`
    );
  }

  function handleTooHard(activity) {
    saveActivityFeedback(activity, "too-hard");
    handleGenerateActivities?.(
      `The activity "${activity.title}" was too hard. Suggest easier alternatives.`
    );
  }

  function handleNeedQuieter(activity) {
    saveActivityFeedback(activity, "need-quieter");
    handleGenerateActivities?.(
      `The activity "${activity.title}" was too loud or active. Suggest quieter alternatives.`
    );
  }

  function handleMoreLikeThis(activity) {
    saveActivityFeedback(activity, "more-like-this");
    handleGenerateActivities?.(
      `The family liked "${activity.title}". Suggest more activities with a similar feeling, but do not repeat the same title.`
    );
  }

  function handleCompletedQuestMoreLikeThis() {
    if (!lastCompletedQuest?.activity) {
      showStatus?.("No completed activity to use yet.", "error");
      return;
    }

    const completedTitle = lastCompletedQuest.title;
    clearLastCompletedQuest?.();
    handleGenerateActivities?.(
      `The child completed "${completedTitle}" and liked it. Suggest 3 more activities with a similar feeling, but do not repeat the same title.`
    );
    navigate?.("/quest");
  }

  function handleCompletedQuestNeedAnotherIdea() {
    const completedTitle = lastCompletedQuest?.title || "the last activity";
    clearLastCompletedQuest?.();
    handleGenerateActivities?.(
      `The child finished "${completedTitle}" and wants something different now. Suggest 3 fresh activities that feel different from the completed one.`
    );
    navigate?.("/quest");
  }

  function clearActivityHistory() {
    const confirmed = window.confirm(
      "Clear all activity history? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    clearHistory?.();
    showStatus?.("Activity history cleared.", "success");
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
    handleCompletedQuestMoreLikeThis,
    handleCompletedQuestNeedAnotherIdea,
    clearActivityHistory,
  };
}
