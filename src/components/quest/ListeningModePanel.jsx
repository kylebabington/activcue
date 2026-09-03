// src/components/quest/ListeningModePanel.jsx

import { useEffect, useRef, useState } from "react";
import SpeakButton from "../SpeakButton";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { buildNarrationText } from "../../utils/buildNarrationText";
import { getSceneInstruction, getStepRoleParts } from "../../utils/questStepCopy";
import {
  getLocalStuckSuggestions,
  nextStuckSuggestion,
} from "../../utils/questStuckHelp";
import { trackProductEvent } from "../../utils/analytics";
import {
  getActivityRoleLabel,
  getStepDetails,
  getStepStarterIdeas,
  getStepStarterSectionLabel,
  getStarterKindIcon,
  getVisualThemeMeta,
} from "../../utils/activityVisualTheme";
import { formatTimer } from "../../utils/activityFormatters";

export default function ListeningModePanel({
  activity,
  playingChildren = [],
  roleAssignments = {},
  onAssignRole,
  onCompleteIntro,
  goToNextQuestStep,
  goToPreviousQuestStep,
  onFinish,
  timerSecondsRemaining,
  timerDone = false,
  onTimerFinished,
  onTimerNotFinished,
  onTimerNeedAnotherIdea,
  onTimerMoreLikeThis,
  onImStuck,
  stuckSuggestion = "",
  isHintLoading = false,
  canUseAiHints = false,
}) {
  const { speak, supported } = useSpeechSynthesis();
  const [localStuckCursor, setLocalStuckCursor] = useState(-1);
  const autoAdvancePendingRef = useRef(false);
  const previousStepIndexRef = useRef(null);

  const readingMode = activity?.readingMode || {};
  const speechRate = Number(readingMode.speechRate) || 0.9;
  const autoAdvance = readingMode.autoAdvance !== false;
  const theme = getVisualThemeMeta(activity?.visualTheme);
  const roleName = getActivityRoleLabel(activity || {});
  const selectedRoleName = activity?.selectedRoleName || roleName;
  const steps = getStepDetails(activity);
  const completedStepIndexes = Array.isArray(activity?.completedStepIndexes)
    ? activity.completedStepIndexes
    : [];
  const currentStepIndex = Number(activity?.currentStepIndex) || 0;
  const introComplete = Boolean(activity?.listeningIntroComplete);
  const allStepsComplete =
    steps.length > 0 &&
    steps.every((_, index) => completedStepIndexes.includes(index));
  const isImaginative = activity?.activityStyle !== "simple";
  const roles = Array.isArray(activity?.roles) ? activity.roles : [];
  const multiChild = playingChildren.length > 1 && roles.length > 1;

  const missionNarration = activity
    ? buildNarrationText(activity, "role", {
        selectedRoleName,
        roleAssignments,
        playingChildren,
      })
    : "";

  const currentStep = steps[currentStepIndex];
  const stepInstruction = getSceneInstruction(currentStep);
  const roleParts = getStepRoleParts(currentStep, {
    playingChildren,
    roleAssignments,
    childRoles: Array.isArray(activity?.roleGuide?.childRoles)
      ? activity.roleGuide.childRoles
      : [],
    selectedRoleName,
  });
  const stepStarters = getStepStarterIdeas(currentStep);
  const stepStarterLabel = getStepStarterSectionLabel(activity);
  const selectedStepStarterByIndex =
    activity?.selectedStepStarterByIndex &&
    typeof activity.selectedStepStarterByIndex === "object"
      ? activity.selectedStepStarterByIndex
      : {};
  const selectedStarterIndex =
    selectedStepStarterByIndex?.[String(currentStepIndex)] ??
    selectedStepStarterByIndex?.[currentStepIndex] ??
    null;
  const stepNarration = activity
    ? buildNarrationText(activity, "step", {
        stepIndex: currentStepIndex,
        selectedRoleName,
        roleAssignments,
        playingChildren,
        selectedStarterIndex,
      })
    : "";
  const localStuckSuggestions = getLocalStuckSuggestions(currentStep);
  const parentStuckSuggestion =
    stuckSuggestion ||
    activity?.stuckSuggestionByStepIndex?.[String(currentStepIndex)] ||
    "";
  const visibleStuckPrompt =
    parentStuckSuggestion ||
    (localStuckCursor >= 0 ? localStuckSuggestions[localStuckCursor] : "");

  useEffect(() => {
    setLocalStuckCursor(-1);
  }, [currentStepIndex]);

  const wasHintLoadingRef = useRef(false);
  useEffect(() => {
    if (isHintLoading) {
      wasHintLoadingRef.current = true;
      return;
    }
    if (!wasHintLoadingRef.current) return;
    wasHintLoadingRef.current = false;
    if (!supported || !parentStuckSuggestion) return;
    trackProductEvent("speech_read_requested", { section: "stuck" });
    speak(parentStuckSuggestion, {
      rate: speechRate,
      key: `listening-stuck-${currentStepIndex}`,
    });
  }, [
    currentStepIndex,
    isHintLoading,
    parentStuckSuggestion,
    speak,
    speechRate,
    supported,
  ]);

  useEffect(() => {
    if (!autoAdvancePendingRef.current) {
      previousStepIndexRef.current = currentStepIndex;
      return;
    }
    if (previousStepIndexRef.current === currentStepIndex) return;
    previousStepIndexRef.current = currentStepIndex;
    autoAdvancePendingRef.current = false;

    if (!supported || allStepsComplete || !introComplete) return;
    if (!stepNarration) return;

    speak(stepNarration, {
      rate: speechRate,
      key: `listening-step-${currentStepIndex}`,
    });
    trackProductEvent("speech_read_requested", { section: "step" });
  }, [
    allStepsComplete,
    currentStepIndex,
    introComplete,
    speak,
    speechRate,
    stepNarration,
    supported,
  ]);

  if (!activity) return null;

  function handleTellMeWhatToDo() {
    trackProductEvent("speech_read_requested", { section: "mission" });
    if (supported && missionNarration) {
      speak(missionNarration, {
        rate: speechRate,
        key: "listening-mission",
        onEnd: () => onCompleteIntro?.(),
      });
    } else {
      onCompleteIntro?.();
    }
  }

  function handleIDidIt() {
    if (allStepsComplete) {
      onFinish?.();
      return;
    }

    trackProductEvent("listening_step_completed", {
      title: activity.title,
      stepIndex: currentStepIndex,
    });

    if (autoAdvance && !allStepsComplete) {
      const isLastStep = currentStepIndex >= steps.length - 1;
      if (!isLastStep) {
        autoAdvancePendingRef.current = true;
      }
    }

    goToNextQuestStep?.();
  }

  function handleNeedHelp() {
    if (isHintLoading) return;
    onImStuck?.(currentStepIndex);
    if (typeof onImStuck !== "function") {
      const next = nextStuckSuggestion(
        localStuckSuggestions.length > 0
          ? localStuckSuggestions
          : getSceneInstruction(currentStep)
            ? [`Try this part next: ${getSceneInstruction(currentStep)}`]
            : [],
        localStuckCursor
      );
      setLocalStuckCursor(next.cursor);
      const stuckText = next.suggestion;
      if (supported && stuckText) {
        trackProductEvent("speech_read_requested", { section: "stuck" });
        speak(stuckText, {
          rate: speechRate,
          key: `listening-stuck-${currentStepIndex}-${next.cursor}`,
        });
      }
    }
  }

  const phase = !introComplete
    ? "mission"
    : allStepsComplete
      ? "finish"
      : "step";

  return (
    <div
      className="listening-mode-panel"
      style={{ "--activity-theme-accent": theme.accent }}
    >
      <p className="listening-mode-eyebrow">
        {theme.icon} {theme.label} · Listening Mode
      </p>

      {phase === "mission" ? (
        <div className="listening-mode-card">
          <p className="listening-mode-kicker">Your Mission</p>
          <h2 className="listening-mode-title">
            {roleName || activity.title}
          </h2>
          {activity.roleGuide?.description ? (
            <p className="listening-mode-lede">
              {activity.roleGuide.description}
            </p>
          ) : activity.mission ? (
            <p className="listening-mode-lede">{activity.mission}</p>
          ) : null}
          {activity.roleGuide?.goal ? (
            <p className="listening-mode-goal">{activity.roleGuide.goal}</p>
          ) : null}

          {multiChild ? (
            <div className="quest-v2-role-picker listening-mode-roles">
              <h3>Pick roles for everyone</h3>
              {playingChildren.map((child) => (
                <label key={child.id} className="quest-v2-role-row">
                  <span>{child.name || "Player"}</span>
                  <select
                    value={roleAssignments?.[child.id] || roles[0] || ""}
                    onChange={(event) =>
                      onAssignRole?.(child.id, event.target.value)
                    }
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}

          <div className="listening-mode-actions">
            <button
              type="button"
              className="listening-mode-primary"
              onClick={handleTellMeWhatToDo}
            >
              Tell me what to do
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => onCompleteIntro?.()}
            >
              Skip to steps
            </button>
          </div>
        </div>
      ) : null}

      {phase === "step" && currentStep ? (
        <div className="listening-mode-card">
          <p className="listening-mode-kicker">
            {isImaginative ? "Scene" : "Step"} {currentStepIndex + 1} of{" "}
            {steps.length}
          </p>
          <h2 className="listening-mode-title">
            {currentStep.title ||
              `${isImaginative ? "Scene" : "Step"} ${currentStepIndex + 1}`}
          </h2>
          <p className="listening-mode-instruction">{stepInstruction}</p>
          {roleParts.length > 0 ? (
            <div className="listening-mode-role-parts">
              <p className="quest-play-card-kicker">Your part</p>
              <ul className="step-role-instructions">
                {roleParts.map((entry) => (
                  <li
                    key={`${entry.childName}-${entry.roleName}-${entry.instruction}`}
                  >
                    <strong>
                      {entry.childName
                        ? `${entry.childName}: `
                        : `${entry.roleName}: `}
                    </strong>
                    {entry.instruction}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {stepStarters.length > 0 ? (
            <div className="listening-mode-starters">
              <p className="quest-step-starters-label">{stepStarterLabel}</p>
              <ul className="listening-mode-starter-list">
                {stepStarters.map((idea, index) => {
                  const selected = selectedStarterIndex === index;
                  return (
                    <li
                      key={`${idea.title}-${index}`}
                      className={
                        selected
                          ? "listening-mode-starter is-selected"
                          : "listening-mode-starter"
                      }
                    >
                      <span aria-hidden="true">
                        {selected ? "✓" : getStarterKindIcon(idea.kind)}
                      </span>{" "}
                      <strong>{idea.title}</strong>
                      {idea.example ? ` — ${idea.example}` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {currentStep.doneWhen ? (
            <p className="listening-mode-done-when">
              {isImaginative
                ? "Ready to move on when: "
                : "Done when: "}
              {currentStep.doneWhen}
            </p>
          ) : null}

          <div className="listening-mode-actions">
            {stepNarration ? (
              <SpeakButton
                text={stepNarration}
                label="Listen"
                speechKey={`listening-step-${currentStepIndex}`}
                rate={speechRate}
                section="step"
                size="large"
              />
            ) : null}
            <button
              type="button"
              className="listening-mode-primary"
              onClick={handleIDidIt}
            >
              I did it
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={handleNeedHelp}
              disabled={isHintLoading}
              title={
                canUseAiHints
                  ? "Get a specific idea for this scene"
                  : "Get another idea for this scene"
              }
            >
              {isHintLoading ? "Thinking…" : "Need help?"}
            </button>
            {currentStepIndex > 0 ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => goToPreviousQuestStep?.()}
              >
                Back
              </button>
            ) : null}
          </div>

          {isHintLoading || visibleStuckPrompt ? (
            <div className="quest-v2-if-stuck" aria-live="polite">
              <p className="quest-play-card-kicker">
                {isHintLoading ? "One idea for this scene" : "Try this"}
              </p>
              <p>
                {isHintLoading
                  ? "Thinking of a specific idea for this scene…"
                  : visibleStuckPrompt}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "finish" ? (
        <div className="listening-mode-card">
          <p className="listening-mode-kicker">Nice work</p>
          <h2 className="listening-mode-title">
            {isImaginative ? "You finished the story" : "You finished"}
          </h2>
          {typeof timerSecondsRemaining === "number" ? (
            <div
              className={timerDone ? "timer-badge done" : "timer-badge"}
              aria-live="polite"
            >
              <span className="timer-label">
                {timerDone ? "Timer" : "Time left"}
              </span>
              <span className="timer-value">
                {timerDone ? "Done!" : formatTimer(timerSecondsRemaining)}
              </span>
            </div>
          ) : null}
          <div className="listening-mode-actions">
            <button type="button" className="listening-mode-primary" onClick={onFinish}>
              {isImaginative ? "Finish the story" : "Mark complete"}
            </button>
            {timerDone ? (
              <>
                <button type="button" onClick={onTimerFinished || onFinish}>
                  Yes, finished
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={onTimerNotFinished}
                >
                  Not really
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={onTimerNeedAnotherIdea}
                >
                  Need another idea
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={onTimerMoreLikeThis}
                >
                  More like this
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
