import { useState } from "react";
import SpeakButton from "../SpeakButton";
import {
  formatEstimatedMinutes,
  formatActivityStyleLabel,
} from "../../utils/activityFormatters";
import {
  getStarterKindIcon,
  getStepStarterIdeas,
  getStepStuckPrompts,
} from "../../utils/activityVisualTheme";
import { buildNarrationText } from "../../utils/buildNarrationText";
import {
  getSceneInstruction,
  getStepRoleParts,
} from "../../utils/questStepCopy";

function QuestPlayCard({
  area,
  kicker,
  title,
  children,
  className = "",
}) {
  return (
    <section
      className={["quest-play-card", className].filter(Boolean).join(" ")}
      data-quest-area={area}
    >
      {kicker ? <p className="quest-play-card-kicker">{kicker}</p> : null}
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

function RoleList({
  childRoles,
  roleName,
  roleGuide,
  isImaginative,
  mode,
  multiChild,
  playingChildren,
  roles,
  roleAssignments,
  onAssignRole,
}) {
  if (childRoles.length > 0) {
    return (
      <>
        <ul className="quest-play-role-list">
          {childRoles.map((role) => (
            <li key={`${role.childName}-${role.roleTitle}`}>
              <strong>{role.childName || "Player"}</strong>
              <span>{role.roleTitle}</span>
            </li>
          ))}
        </ul>
        {mode === "active" && multiChild ? (
          <div className="quest-v2-role-picker">
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
      </>
    );
  }

  return (
    <div className="quest-play-role-solo">
      {roleName ? <p className="quest-play-role-name">{roleName}</p> : null}
      {roleGuide?.description ? <p>{roleGuide.description}</p> : null}
      {roleGuide?.goal ? (
        <p>
          <em>{isImaginative ? "Your mission:" : "Your job:"}</em>{" "}
          {roleGuide.goal}
        </p>
      ) : null}
    </div>
  );
}

function StarterList({
  ideas,
  mode,
  checkedStarterIndexes,
  onToggleStarter,
}) {
  if (ideas.length === 0) {
    return <p>Use whatever feels fun to start.</p>;
  }

  return (
    <div className="quest-v2-starter-doors">
      {ideas.map((idea, index) => {
        const checked = checkedStarterIndexes.includes(index);
        if (mode === "active") {
          return (
            <button
              key={`${idea.title}-${index}`}
              type="button"
              className={
                checked
                  ? "quest-v2-starter-door is-open"
                  : "quest-v2-starter-door"
              }
              onClick={() => onToggleStarter?.(index)}
            >
              <span className="quest-v2-starter-title">{idea.title}</span>
              {idea.example ? (
                <span className="quest-v2-starter-example">{idea.example}</span>
              ) : null}
            </button>
          );
        }

        return (
          <div key={`${idea.title}-${index}`} className="quest-v2-starter-door">
            <span className="quest-v2-starter-title">{idea.title}</span>
            {idea.example ? (
              <span className="quest-v2-starter-example">{idea.example}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CurrentSceneCard({
  step,
  index,
  stepsLength,
  isComplete,
  isHighlighted,
  isImaginative,
  themeKey,
  themeAccent,
  starterSectionLabel,
  selectedStarterIndex,
  onSelectStepStarter,
  onToggleStep,
  onImStuck,
  speechRate,
  stepNarration,
  roleParts,
}) {
  const instruction = getSceneInstruction(step);
  const starterIdeas = getStepStarterIdeas(step);
  const stuckPrompts = getStepStuckPrompts(step);
  const [stuckPromptIndex, setStuckPromptIndex] = useState(-1);
  const extraStuckPrompts = stuckPrompts.filter(
    (prompt) => prompt !== String(step?.ifStuck || "").trim()
  );
  const visibleStuckPrompt =
    stuckPromptIndex >= 0 ? extraStuckPrompts[stuckPromptIndex] : "";
  const sceneLabel = isImaginative ? "Scene" : "Step";
  const heading = step?.title
    ? `${sceneLabel} ${index + 1} — ${step.title}`
    : `${sceneLabel} ${index + 1} of ${stepsLength}`;
  const canSelectStarters = typeof onSelectStepStarter === "function";
  const doneWhenLabel = isImaginative
    ? "Ready to move on when"
    : "Done when";

  function handleStuckClick() {
    if (extraStuckPrompts.length > 0) {
      const nextIndex = (stuckPromptIndex + 1) % extraStuckPrompts.length;
      setStuckPromptIndex(nextIndex);
      onImStuck?.(index, nextIndex);
      return;
    }
    onImStuck?.(index, 0);
  }

  return (
    <article
      id={`quest-step-${index}`}
      className={[
        "quest-step-card",
        "quest-current-scene",
        isImaginative ? "quest-step-card--story" : "",
        `activity-card--theme-${themeKey}`,
        isComplete ? "is-complete" : "",
        isHighlighted ? "is-highlighted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        themeAccent ? { "--activity-theme-accent": themeAccent } : undefined
      }
    >
      <p className="quest-play-card-kicker">
        Current {isImaginative ? "scene" : "step"}
      </p>
      <div className="quest-step-card-header">
        <h3>{heading}</h3>
        {stepNarration ? (
          <SpeakButton
            text={stepNarration}
            label="Read this step"
            speechKey={`quest-step-${index}`}
            rate={speechRate}
            section="step"
          />
        ) : null}
      </div>

      <p className={isImaginative ? "quest-step-story-prompt" : undefined}>
        {instruction}
      </p>

      {roleParts.length > 0 ? (
        <div className="quest-scene-block">
          <p className="quest-play-card-kicker">Your part</p>
          <ul className="step-role-instructions">
            {roleParts.map((entry) => (
              <li key={`${entry.childName}-${entry.roleName}-${entry.instruction}`}>
                <strong>
                  {entry.childName
                    ? `${entry.childName}: `
                    : `${entry.roleName}: `}
                </strong>
                {entry.childName ? (
                  <span className="quest-role-part-title">{entry.roleName}. </span>
                ) : null}
                {entry.instruction}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {starterIdeas.length > 0 ? (
        <div className="quest-step-starters">
          <p className="quest-play-card-kicker">{starterSectionLabel}</p>
          <div
            className="quest-step-starter-grid"
            data-count={Math.min(starterIdeas.length, 3)}
          >
            {starterIdeas.map((idea, starterIndex) => {
              const selected = selectedStarterIndex === starterIndex;
              const className = [
                "quest-step-starter-card",
                selected ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const content = (
                <>
                  <span className="quest-step-starter-card-title">
                    <span
                      className="quest-step-starter-card-icon"
                      aria-hidden="true"
                    >
                      {selected ? "✓" : getStarterKindIcon(idea.kind)}
                    </span>
                    {idea.title}
                  </span>
                  {idea.example ? (
                    <span className="quest-step-starter-card-example">
                      {idea.example}
                    </span>
                  ) : null}
                </>
              );

              if (canSelectStarters) {
                return (
                  <button
                    key={`${idea.title}-${starterIndex}`}
                    type="button"
                    className={className}
                    aria-pressed={selected}
                    onClick={() => onSelectStepStarter?.(index, starterIndex)}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div key={`${idea.title}-${starterIndex}`} className={className}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {step?.ifStuck ? (
        <div className="quest-scene-block">
          <p className="quest-play-card-kicker">Fix idea</p>
          <p>{step.ifStuck}</p>
        </div>
      ) : null}

      {step?.doneWhen ? (
        <div className="quest-scene-block quest-scene-block--done">
          <p className="quest-play-card-kicker">{doneWhenLabel}</p>
          <p>{step.doneWhen}</p>
        </div>
      ) : null}

      {visibleStuckPrompt ? (
        <div className="quest-v2-if-stuck" aria-live="polite">
          <p className="quest-step-stuck-counter">
            Extra idea {stuckPromptIndex + 1} of {extraStuckPrompts.length}
          </p>
          <p>{visibleStuckPrompt}</p>
        </div>
      ) : null}

      <div className="quest-current-scene-actions">
        {stuckPrompts.length > 0 ? (
          <button
            type="button"
            className="secondary-action"
            onClick={handleStuckClick}
          >
            I’m stuck
          </button>
        ) : null}
        <button
          type="button"
          className="quest-step-complete-toggle"
          aria-pressed={Boolean(isComplete)}
          onClick={() => onToggleStep?.(index)}
        >
          {isComplete
            ? isImaginative
              ? "Scene complete"
              : "Done"
            : "Complete"}
        </button>
      </div>
    </article>
  );
}

export default function ActiveQuestLayout({
  activity,
  isImaginativeActivity,
  theme,
  mission,
  roleName,
  roleGuide,
  childRoles,
  steps,
  uses,
  starterIdeas,
  extensions,
  completedStepIndexes,
  checkedStarterIndexes,
  selectedStepStarterByIndex,
  onToggleStep,
  onToggleStarter,
  onSelectStepStarter,
  onImStuck,
  highlightedStuckStepIndex,
  focusStepIndex,
  playingChildren,
  roleAssignments,
  onAssignRole,
  selectedRoleName,
  roles,
  multiChild,
  onFinish,
  timerSecondsRemaining,
  formatTimer,
  timerDone,
  onTimerFinished,
  onTimerNotFinished,
  onTimerNeedAnotherIdea,
  onTimerMoreLikeThis,
  resolvedSpeechRate,
  missionNarration,
}) {
  const currentIndex =
    Number.isFinite(Number(focusStepIndex)) && focusStepIndex >= 0
      ? focusStepIndex
      : 0;
  const currentStep = steps[currentIndex];
  const otherSteps = steps
    .map((step, index) => ({ step, index }))
    .filter(({ index }) => index !== currentIndex);
  const minutes = formatEstimatedMinutes(activity.estimatedMinutes, {
    suffix: " minutes",
  });
  const metaParts = [
    theme.label,
    minutes,
    formatActivityStyleLabel(activity.activityStyle),
  ].filter(Boolean);

  return (
    <div
      className="quest-content quest-content--active"
      data-quest-layout="active"
    >
      <p className="quest-active-meta">
        {metaParts.join(" • ")}
      </p>

      <QuestPlayCard
        area="story"
        className="quest-active-story"
        title={isImaginativeActivity ? "The Story" : "Overview"}
      >
        {missionNarration ? (
          <div className="quest-section-speak-row">
            <SpeakButton
              text={missionNarration}
              label="Read"
              speechKey="quest-mission"
              rate={resolvedSpeechRate}
              section="mission"
            />
          </div>
        ) : null}
        <p>{mission || activity.summary || activity.theme}</p>
      </QuestPlayCard>

      <aside className="quest-active-left">
        <QuestPlayCard area="roles" title="Your Roles">
          <RoleList
            childRoles={childRoles}
            roleName={roleName}
            roleGuide={roleGuide}
            isImaginative={isImaginativeActivity}
            mode="active"
            multiChild={multiChild}
            playingChildren={playingChildren}
            roles={roles}
            roleAssignments={roleAssignments}
            onAssignRole={onAssignRole}
          />
        </QuestPlayCard>

        <QuestPlayCard
          area="supplies"
          title={isImaginativeActivity ? "Props & Supplies" : "What You Need"}
        >
          {uses.length > 0 ? (
            <ul>
              {uses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>Use whatever you already have nearby.</p>
          )}
        </QuestPlayCard>
      </aside>

      <div className="quest-active-center">
        <div className="quest-active-stage" data-quest-area="stage">
          {currentStep ? (
            <CurrentSceneCard
              step={currentStep}
              index={currentIndex}
              stepsLength={steps.length}
              isComplete={completedStepIndexes.includes(currentIndex)}
              isHighlighted={highlightedStuckStepIndex === currentIndex}
              isImaginative={isImaginativeActivity}
              themeKey={theme.key}
              themeAccent={theme.accent}
              starterSectionLabel="Try this"
              selectedStarterIndex={
                selectedStepStarterByIndex?.[String(currentIndex)] ??
                selectedStepStarterByIndex?.[currentIndex] ??
                null
              }
              onSelectStepStarter={onSelectStepStarter}
              onToggleStep={onToggleStep}
              onImStuck={onImStuck}
              speechRate={resolvedSpeechRate}
              stepNarration={buildNarrationText(activity, "step", {
                stepIndex: currentIndex,
                selectedRoleName: selectedRoleName || roleName,
                roleAssignments,
                selectedStarterIndex:
                  selectedStepStarterByIndex?.[String(currentIndex)] ??
                  selectedStepStarterByIndex?.[currentIndex] ??
                  null,
              })}
              roleParts={getStepRoleParts(currentStep, {
                playingChildren,
                roleAssignments,
                childRoles,
                selectedRoleName: selectedRoleName || roleName,
              })}
            />
          ) : (
            <p>No steps listed.</p>
          )}
        </div>

        {otherSteps.length > 0 ? (
          <section
            className="quest-play-card quest-active-other-scenes"
            data-quest-area="other"
          >
            <p className="quest-play-card-kicker">
              Other {isImaginativeActivity ? "scenes" : "steps"}
            </p>
            <ul className="quest-other-scene-list">
              {otherSteps.map(({ step, index }) => {
                const isComplete = completedStepIndexes.includes(index);
                const label = isImaginativeActivity ? "Scene" : "Step";
                return (
                  <li
                    key={`${step.title}-${index}`}
                    id={`quest-step-${index}`}
                    className={
                      isComplete
                        ? "quest-other-scene is-complete"
                        : "quest-other-scene"
                    }
                  >
                    <span>
                      {label} {index + 1}
                      {step.title ? ` — ${step.title}` : ""}
                    </span>
                    <button
                      type="button"
                      className="quest-step-complete-toggle"
                      aria-pressed={isComplete}
                      onClick={() => onToggleStep?.(index)}
                    >
                      {isComplete ? "Done" : "Complete"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="quest-active-right">
        {starterIdeas.length > 0 ? (
          <QuestPlayCard area="starters" title="Starting Ideas">
            <StarterList
              ideas={starterIdeas}
              mode="active"
              checkedStarterIndexes={checkedStarterIndexes}
              onToggleStarter={onToggleStarter}
            />
          </QuestPlayCard>
        ) : null}

        <QuestPlayCard
          area="finish"
          title={isImaginativeActivity ? "The Big Finish" : "Finish the Activity"}
        >
          {extensions.length > 0 ? (
            <ul>
              {extensions.map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>
          ) : (
            <p>
              {isImaginativeActivity
                ? "When the last scene is done, wrap the story and celebrate."
                : "When the last step is done, you are finished."}
            </p>
          )}

          {typeof timerSecondsRemaining === "number" && formatTimer ? (
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

          <div className="quest-finish-actions">
            <button type="button" onClick={onFinish}>
              {isImaginativeActivity ? "Finish the story" : "Mark complete"}
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
        </QuestPlayCard>
      </aside>
    </div>
  );
}
