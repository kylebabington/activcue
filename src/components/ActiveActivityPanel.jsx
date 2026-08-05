import { useEffect, useMemo, useRef } from "react";
import QuestContent from "./quest/QuestContent";
import { getDefaultOpenSections } from "./quest/questSectionDefaults";
import { useActivityTimer } from "../features/quest/useActivityTimer";
import { formatTimer } from "../utils/activityFormatters";
import {
  getActivityRoleLabel,
  getStepDetails,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";
import { trackProductEvent } from "../utils/analytics";

function ActiveActivityPanel({
  activeActivity,
  currentMoment,
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
  playingChildren = [],
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
  const openSections =
    activeActivity.openSections || getDefaultOpenSections({ finish: false });
  const timerDone = timerSecondsRemaining <= 0;
  const firstIncompleteIndex = steps.findIndex(
    (_, index) => !completedStepIndexes.includes(index)
  );
  const focusStepIndex =
    firstIncompleteIndex >= 0 ? firstIncompleteIndex : steps.length - 1;
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

  function handleImStuck(stepIndex, promptIndex) {
    trackProductEvent("built_in_help_opened", {
      title: activeActivity.title,
      stepIndex,
      promptIndex,
      candidateId: activeActivity.candidateId || null,
      recommendationBatchId: activeActivity.recommendationBatchId || null,
      momentId: activeActivity.momentId || null,
    });
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
        focusStepIndex={focusStepIndex}
        playingChildren={playingChildren}
        roleAssignments={activeActivity.roleAssignments}
        onAssignRole={assignRole}
        selectedRoleName={activeActivity.selectedRoleName || roleName}
        extensionIdeas={extensionIdeas}
        onFinish={finishActiveActivity}
        timerSecondsRemaining={timerSecondsRemaining}
        formatTimer={formatTimer}
        timerDone={timerDone}
        onTimerFinished={finishActiveActivity}
        onTimerNotFinished={handleTimerNotFinished}
        onTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
        onTimerMoreLikeThis={handleTimerMoreLikeThis}
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
