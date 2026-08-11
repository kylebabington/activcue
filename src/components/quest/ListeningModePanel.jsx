// src/components/quest/ListeningModePanel.jsx

import { useEffect, useRef, useState } from "react";
import SpeakButton from "../SpeakButton";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { buildNarrationText } from "../../utils/buildNarrationText";
import { trackProductEvent } from "../../utils/analytics";
import {
  getActivityRoleLabel,
  getStepDetails,
  getStepStarterIdeas,
  getStepStarterSectionLabel,
  getStepStuckPrompts,
  getStarterKindIcon,
  getVisualThemeMeta,
} from "../../utils/activityVisualTheme";
import { formatTimer } from "../../utils/activityFormatters";

function resolveStepInstruction(step, selectedRoleName, roleAssignments) {
  if (!step) return "";
  const roleInstructions = Array.isArray(step.roleInstructions)
    ? step.roleInstructions
    : [];
  const assignedRoles = Object.values(roleAssignments || {}).filter(Boolean);
  const preferredRoles = [selectedRoleName, ...assignedRoles].filter(Boolean);

  for (const roleName of preferredRoles) {
    const match = roleInstructions.find(
      (entry) =>
        entry?.roleName &&
        entry.roleName.toLowerCase() === String(roleName).toLowerCase()
    );
    if (match?.instruction) return match.instruction;
  }
  return step.instruction || "";
}

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
}) {
  const { speak, supported } = useSpeechSynthesis();
  const [stuckPromptIndex, setStuckPromptIndex] = useState(-1);
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
      })
    : "";

  const currentStep = steps[currentStepIndex];
  const stepInstruction = resolveStepInstruction(
    currentStep,
    selectedRoleName,
    roleAssignments
  );
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
        selectedStarterIndex,
      })
    : "";
  const stuckPrompts = getStepStuckPrompts(currentStep);
  const visibleStuckPrompt =
    stuckPromptIndex >= 0 ? stuckPrompts[stuckPromptIndex] : "";

  useEffect(() => {
    setStuckPromptIndex(-1);
  }, [currentStepIndex]);

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
    if (stuckPrompts.length === 0) return;
    const nextIndex = (stuckPromptIndex + 1) % stuckPrompts.length;
    setStuckPromptIndex(nextIndex);
    onImStuck?.(currentStepIndex, nextIndex);

    const stuckText = buildNarrationText(activity, "stuck", {
      stepIndex: currentStepIndex,
      stuckPromptIndex: nextIndex,
    });
    trackProductEvent("speech_read_requested", { section: "stuck" });
    if (supported && stuckText) {
      speak(stuckText, {
        rate: speechRate,
        key: `listening-stuck-${currentStepIndex}-${nextIndex}`,
      });
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
            {currentStep.title || `Step ${currentStepIndex + 1}`}
          </h2>
          <p className="listening-mode-instruction">{stepInstruction}</p>
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
                ? "Ready for the next part when: "
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
            {stuckPrompts.length > 0 ? (
              <button
                type="button"
                className="secondary-action"
                onClick={handleNeedHelp}
              >
                Need help?
              </button>
            ) : null}
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

          {visibleStuckPrompt ? (
            <div className="quest-v2-if-stuck" aria-live="polite">
              <p className="quest-step-stuck-counter">
                Idea {stuckPromptIndex + 1} of {stuckPrompts.length}
              </p>
              <p>{visibleStuckPrompt}</p>
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
