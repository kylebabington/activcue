import { useEffect, useMemo, useRef } from "react";
import QuestContent from "./quest/QuestContent";
import QuestSetupScreen from "./quest/QuestSetupScreen";
import ListeningModePanel from "./quest/ListeningModePanel";
import { getDefaultOpenSections } from "./quest/questSectionDefaults";
import { useActivityTimer } from "../features/quest/useActivityTimer";
import { formatTimer } from "../utils/activityFormatters";
import {
  getActivityRoleLabel,
  activityNeedsSetup,
  getStepDetails,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";
import { trackProductEvent } from "../utils/analytics";
import { isSpeechSynthesisSupported } from "../utils/speechSynthesis";

function ActiveActivityPanel({
  activeActivity,
  currentMoment,
  finishActiveActivity,
  completeSetup,
  toggleSetupCollapsed,
  cancelActiveActivity,
  handleTimerNotFinished,
  handleTimerNeedAnotherIdea,
  handleTimerMoreLikeThis,
  goToNextQuestStep,
  goToPreviousQuestStep,
  toggleQuestStepComplete,
  setQuestPhase,
  toggleStarterIdea,
  selectStepStarter,
  assignRole,
  toggleBuiltInHelp,
  setOpenSection,
  completeListeningIntro,
  setActivityReadingModeEnabled,
  playingChildren = [],
  stepHint = "",
  isHintLoading = false,
  hintLoadingStepIndex = null,
  handleNeedStepHint,
  canUseAiHints = false,
}) {
  const timerSecondsRemaining = useActivityTimer(activeActivity);
  const theme = getVisualThemeMeta(activeActivity.visualTheme);
  const roleName = getActivityRoleLabel(activeActivity);
  const steps = getStepDetails(activeActivity);
  const completedStepIndexes = Array.isArray(activeActivity.completedStepIndexes)
    ? activeActivity.completedStepIndexes
    : [];
  const checkedStarterIndexes = Array.isArray(
    activeActivity.checkedStarterIndexes
  )
    ? activeActivity.checkedStarterIndexes
    : [];
  const selectedStepStarterByIndex =
    activeActivity.selectedStepStarterByIndex &&
    typeof activeActivity.selectedStepStarterByIndex === "object"
      ? activeActivity.selectedStepStarterByIndex
      : {};
  const openSections =
    activeActivity.openSections || getDefaultOpenSections({ finish: false });
  const timerDone =
    Boolean(activeActivity?.startedAt) && timerSecondsRemaining <= 0;
  const timerWaiting =
    !activeActivity?.startedAt && activityNeedsSetup(activeActivity);
  const firstIncompleteIndex = steps.findIndex(
    (_, index) => !completedStepIndexes.includes(index)
  );
  const focusStepIndex =
    firstIncompleteIndex >= 0 ? firstIncompleteIndex : steps.length - 1;
  const didScrollOnMount = useRef(false);
  const readingMode = activeActivity.readingMode || {};
  const listeningEnabled = Boolean(readingMode.enabled);
  const speechRate = Number(readingMode.speechRate) || 0.9;

  void setQuestPhase;
  void toggleBuiltInHelp;

  useEffect(() => {
    if (listeningEnabled) return;
    const panel = document.getElementById("active-activity-panel");
    panel?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    if (didScrollOnMount.current) return;
    didScrollOnMount.current = true;
    if (focusStepIndex < 0) return;
    const node = document.getElementById(`quest-step-${focusStepIndex}`);
    node?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [focusStepIndex, listeningEnabled]);

  useEffect(() => {
    if (!timerDone) return;
    setOpenSection?.("finish", true);
    setOpenSection?.("steps", true);
  }, [timerDone, setOpenSection]);

  const extensionIdeas = useMemo(
    () =>
      Array.isArray(activeActivity.extensionIdeas)
        ? activeActivity.extensionIdeas
        : [],
    [activeActivity.extensionIdeas]
  );

  function handleImStuck(stepIndex) {
    trackProductEvent("activity_stuck_clicked", {
      title: activeActivity.title,
      stepIndex,
      activityFormatVersion: activeActivity.activityFormatVersion || 2,
    });
    trackProductEvent("built_in_help_opened", {
      title: activeActivity.title,
      stepIndex,
      promptIndex: 0,
      candidateId: activeActivity.candidateId || null,
      recommendationBatchId: activeActivity.recommendationBatchId || null,
      momentId: activeActivity.momentId || null,
    });
    void handleNeedStepHint?.(stepIndex);
  }

  function handleToggleListeningMode() {
    const nextEnabled = !listeningEnabled;
    trackProductEvent("listening_mode_toggled", {
      enabled: nextEnabled,
      title: activeActivity.title,
    });
    setActivityReadingModeEnabled?.(nextEnabled);
  }

  return (
    <section
      id="active-activity-panel"
      className="panel active-activity-panel pretend-active-panel quest-v2-panel"
      style={{ "--activity-theme-accent": theme.accent }}
    >
      <div className="active-activity-toolbar">
        <h1 className="simple-active-title">{activeActivity.title}</h1>
        {isSpeechSynthesisSupported() ? (
          <button
            type="button"
            className="secondary-action active-listening-toggle"
            onClick={handleToggleListeningMode}
            aria-pressed={listeningEnabled}
          >
            {listeningEnabled ? "Show all steps" : "Listening mode"}
          </button>
        ) : null}
      </div>

      {activeActivity.questPhase === "setup" && !activeActivity.setupComplete ? (
        <QuestSetupScreen
          activity={activeActivity}
          onCompleteSetup={completeSetup}
          onCancel={cancelActiveActivity}
          speechRate={speechRate}
        />
      ) : listeningEnabled ? (
        <ListeningModePanel
          activity={activeActivity}
          playingChildren={playingChildren}
          roleAssignments={activeActivity.roleAssignments}
          onAssignRole={assignRole}
          onCompleteIntro={completeListeningIntro}
          goToNextQuestStep={goToNextQuestStep}
          goToPreviousQuestStep={goToPreviousQuestStep}
          onFinish={finishActiveActivity}
          timerSecondsRemaining={timerSecondsRemaining}
          timerDone={timerDone}
          onTimerFinished={finishActiveActivity}
          onTimerNotFinished={handleTimerNotFinished}
          onTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
          onTimerMoreLikeThis={handleTimerMoreLikeThis}
          onImStuck={handleImStuck}
          stuckSuggestion={
            activeActivity.stuckSuggestionByStepIndex?.[
              String(activeActivity.currentStepIndex || 0)
            ] || stepHint
          }
          isHintLoading={isHintLoading}
          canUseAiHints={canUseAiHints}
        />
      ) : (
        <QuestContent
          activity={activeActivity}
          mode="active"
          currentMoment={currentMoment}
          openSections={openSections}
          onSectionOpenChange={(key, nextOpen) => setOpenSection?.(key, nextOpen)}
          completedStepIndexes={completedStepIndexes}
          checkedStarterIndexes={checkedStarterIndexes}
          selectedStepStarterByIndex={selectedStepStarterByIndex}
          onToggleStep={toggleQuestStepComplete}
          onToggleStarter={toggleStarterIdea}
          onSelectStepStarter={selectStepStarter}
          onImStuck={handleImStuck}
          stuckSuggestionByStepIndex={
            activeActivity.stuckSuggestionByStepIndex || {}
          }
          isHintLoading={isHintLoading}
          hintLoadingStepIndex={hintLoadingStepIndex}
          canUseAiHints={canUseAiHints}
          focusStepIndex={focusStepIndex}
          onToggleSetupCollapsed={toggleSetupCollapsed}
          setupCollapsed={Boolean(activeActivity.setupCollapsed)}
          playingChildren={playingChildren}
          roleAssignments={activeActivity.roleAssignments}
          onAssignRole={assignRole}
          selectedRoleName={activeActivity.selectedRoleName || roleName}
          extensionIdeas={extensionIdeas}
          onFinish={finishActiveActivity}
          timerSecondsRemaining={timerSecondsRemaining}
          formatTimer={formatTimer}
          timerDone={timerDone}
          timerWaiting={timerWaiting}
          onTimerFinished={finishActiveActivity}
          onTimerNotFinished={handleTimerNotFinished}
          onTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
          onTimerMoreLikeThis={handleTimerMoreLikeThis}
          speechRate={speechRate}
        />
      )}

      <div className="simple-active-actions quest-v2-global-actions">
        <button type="button" className="ghost-button" onClick={cancelActiveActivity}>
          Stop
        </button>
        <button type="button" onClick={finishActiveActivity}>
          Done
        </button>
      </div>
    </section>
  );
}

export default ActiveActivityPanel;
