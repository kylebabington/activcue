import { useEffect, useMemo, useRef } from "react";
import QuestContent from "./quest/QuestContent";
import { getDefaultOpenSections } from "./quest/questSectionDefaults";
import {
  getActivityRoleLabel,
  getStepDetails,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";

function ActiveActivityPanel({
  activeActivity,
  currentMoment,
  timerSecondsRemaining,
  finishActiveActivity,
  cancelActiveActivity,
  handleTimerNotFinished,
  handleTimerNeedAnotherIdea,
  handleTimerMoreLikeThis,
  goToNextQuestStep,
  goToPreviousQuestStep,
  toggleQuestStepComplete,
  setQuestPhase,
  toggleStarterIdea,
  assignRole,
  toggleBuiltInHelp,
  setOpenSection,
  openRescueSection,
  stepHint,
  isHintLoading,
  handleNeedStepHint,
  canUseAiHints = true,
  formatTimer,
  playingChildren = [],
}) {
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
  const openSections =
    activeActivity.openSections || getDefaultOpenSections({ finish: false });
  const timerDone = timerSecondsRemaining <= 0;
  const firstIncompleteIndex = steps.findIndex(
    (_, index) => !completedStepIndexes.includes(index)
  );
  const focusStepIndex =
    firstIncompleteIndex >= 0 ? firstIncompleteIndex : steps.length - 1;
  const highlightedStuckStepIndex =
    typeof activeActivity.highlightedStuckStepIndex === "number"
      ? activeActivity.highlightedStuckStepIndex
      : null;
  const didScrollOnMount = useRef(false);

  // Keep unused phased helpers referenced so callers stay stable during migration.
  void goToNextQuestStep;
  void goToPreviousQuestStep;
  void setQuestPhase;
  void toggleBuiltInHelp;

  useEffect(() => {
    if (didScrollOnMount.current) return;
    didScrollOnMount.current = true;
    if (focusStepIndex < 0) return;
    const node = document.getElementById(`quest-step-${focusStepIndex}`);
    node?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [focusStepIndex]);

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
    // Keep the existing built-in-help telemetry/state hook, but do not navigate
    // away from the step. QuestStepCard displays and cycles the prompt inline.
    openRescueSection?.(stepIndex);
  }

  return (
    <section
      id="active-activity-panel"
      className="panel active-activity-panel pretend-active-panel quest-v2-panel"
      style={{ "--activity-theme-accent": theme.accent }}
    >
      <h1 className="simple-active-title">{activeActivity.title}</h1>

      <QuestContent
        activity={activeActivity}
        mode="active"
        currentMoment={currentMoment}
        openSections={openSections}
        onSectionOpenChange={(key, nextOpen) => setOpenSection?.(key, nextOpen)}
        completedStepIndexes={completedStepIndexes}
        checkedStarterIndexes={checkedStarterIndexes}
        onToggleStep={toggleQuestStepComplete}
        onToggleStarter={toggleStarterIdea}
        onImStuck={handleImStuck}
        highlightedStuckStepIndex={highlightedStuckStepIndex}
        focusStepIndex={focusStepIndex}
        playingChildren={playingChildren}
        roleAssignments={activeActivity.roleAssignments}
        onAssignRole={assignRole}
        selectedRoleName={activeActivity.selectedRoleName || roleName}
        extensionIdeas={extensionIdeas}
        stepHint={stepHint}
        isHintLoading={isHintLoading}
        canUseAiHints={canUseAiHints}
        onNeedStepHint={handleNeedStepHint}
        onFinish={finishActiveActivity}
        timerSecondsRemaining={timerSecondsRemaining}
        formatTimer={formatTimer}
        timerDone={timerDone}
        onTimerFinished={finishActiveActivity}
        onTimerNotFinished={handleTimerNotFinished}
        onTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
        onTimerMoreLikeThis={handleTimerMoreLikeThis}
        usedRescueMode={Boolean(activeActivity.usedRescueMode)}
      />

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
