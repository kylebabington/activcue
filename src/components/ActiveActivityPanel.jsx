import {
  getActivityMissionText,
  getActivityRoleLabel,
  getStarterIdeas,
  getStepDetails,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";

const INTRO_PHASES = ["world", "role", "starters"];

function resolveStepInstruction(step, selectedRoleName, roleAssignments) {
  if (!step) {
    return "";
  }

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
    if (match?.instruction) {
      return match.instruction;
    }
  }

  return step.instruction || "";
}

function IntroWorld({ activity, theme, mission, onContinue }) {
  return (
    <div className="quest-v2-intro">
      <div
        className={`quest-v2-world-band activity-card--theme-${theme.key}`}
        style={{ "--activity-theme-accent": theme.accent }}
      >
        <span className="quest-v2-world-icon" aria-hidden="true">
          {theme.icon}
        </span>
        <div>
          <p className="quest-v2-kicker">The world</p>
          <h2>{theme.label}</h2>
        </div>
      </div>
      <p className="quest-v2-lede">
        {mission || activity.summary || "A pretend adventure is ready."}
      </p>
      {activity.theme ? <p className="activity-theme">{activity.theme}</p> : null}
      <button type="button" onClick={onContinue}>
        Meet your role
      </button>
    </div>
  );
}

function IntroRole({
  activity,
  roleName,
  roles,
  playingChildren,
  roleAssignments,
  onAssignRole,
  onContinue,
  onBack,
}) {
  const roleGuide = activity.roleGuide;
  const multiChild = playingChildren.length > 1 && roles.length > 1;

  return (
    <div className="quest-v2-intro">
      <p className="quest-v2-kicker">Your role</p>
      <h2>You are {roleName}</h2>
      {roleGuide?.description ? <p>{roleGuide.description}</p> : null}
      {roleGuide?.goal ? (
        <p>
          <em>Your job:</em> {roleGuide.goal}
        </p>
      ) : null}
      {roleGuide?.firstAction ? (
        <p>
          <em>Start with:</em> {roleGuide.firstAction}
        </p>
      ) : null}

      {multiChild ? (
        <div className="quest-v2-role-picker">
          <h3>Pick roles for everyone</h3>
          {playingChildren.map((child) => (
            <label key={child.id} className="quest-v2-role-row">
              <span>{child.name || "Player"}</span>
              <select
                value={roleAssignments?.[child.id] || roles[0] || ""}
                onChange={(event) => onAssignRole(child.id, event.target.value)}
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

      <div className="quest-v2-intro-actions">
        <button type="button" className="secondary-action" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onContinue}>
          Start here
        </button>
      </div>
    </div>
  );
}

function IntroStarters({
  starterIdeas,
  checkedStarterIndexes,
  onToggleStarter,
  onContinue,
  onBack,
}) {
  const doors = starterIdeas.slice(0, 6);

  return (
    <div className="quest-v2-intro">
      <p className="quest-v2-kicker">Start here</p>
      <h2>Open a door to begin</h2>
      <p className="quest-v2-lede">
        Try one or two ideas, then move into the steps.
      </p>
      <div className="quest-v2-starter-doors">
        {doors.map((idea, index) => {
          const checked = checkedStarterIndexes.includes(index);
          return (
            <button
              key={`${idea.title}-${index}`}
              type="button"
              className={
                checked
                  ? "quest-v2-starter-door is-open"
                  : "quest-v2-starter-door"
              }
              onClick={() => onToggleStarter(index)}
            >
              <span className="quest-v2-starter-title">{idea.title}</span>
              {idea.example ? (
                <span className="quest-v2-starter-example">{idea.example}</span>
              ) : null}
              {idea.kind ? (
                <span className="quest-v2-starter-kind">{idea.kind}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="quest-v2-intro-actions">
        <button type="button" className="secondary-action" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onContinue}>
          Begin the steps
        </button>
      </div>
    </div>
  );
}

function StepCard({
  step,
  stepIndex,
  totalSteps,
  instruction,
  isComplete,
  showBuiltInHelp,
  showAiHintPanel,
  stepHint,
  isHintLoading,
  canUseAiHints,
  extensionIdeas,
  onToggleComplete,
  onDoneNext,
  onBack,
  onToggleBuiltInHelp,
  onNeedStepHint,
  onFinish,
  isLastStep,
  isFirstStep,
}) {
  const examples = Array.isArray(step?.examples) ? step.examples : [];

  return (
    <div className="quest-v2-step-card">
      <p className="quest-v2-kicker">
        Step {stepIndex + 1} of {totalSteps}
      </p>
      <h2>{step?.title || `Step ${stepIndex + 1}`}</h2>

      <div className="quest-v2-step-block">
        <h3>What to do</h3>
        <p>{instruction}</p>
      </div>

      {examples.length > 0 ? (
        <details className="quest-v2-step-block">
          <summary>Need an idea?</summary>
          <ul>
            {examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {step?.doneWhen ? (
        <div className="quest-v2-step-block">
          <h3>You’re done when</h3>
          <p>{step.doneWhen}</p>
        </div>
      ) : null}

      <div className="quest-v2-step-actions">
        <button
          type="button"
          className="secondary-action"
          onClick={onBack}
          disabled={isFirstStep}
        >
          Back
        </button>
        {isComplete ? (
          <button
            type="button"
            className="secondary-action"
            onClick={onToggleComplete}
          >
            Undo
          </button>
        ) : (
          <button type="button" onClick={onDoneNext}>
            Done — next
          </button>
        )}
      </div>

      {step?.ifStuck ? (
        <div className="quest-v2-help">
          <button
            type="button"
            className="secondary-action"
            onClick={onToggleBuiltInHelp}
          >
            {showBuiltInHelp ? "Hide help" : "I’m stuck"}
          </button>
          {showBuiltInHelp ? (
            <p className="quest-v2-if-stuck">{step.ifStuck}</p>
          ) : null}
        </div>
      ) : null}

      {showBuiltInHelp || !step?.ifStuck ? (
        <div className="quest-v2-ai-fallback">
          <button
            type="button"
            className={canUseAiHints ? "text-action" : "text-action hint-button--plus"}
            onClick={onNeedStepHint}
            disabled={isHintLoading || !canUseAiHints}
            title={
              canUseAiHints
                ? undefined
                : "AI hints are included with FamilyFlow Plus"
            }
          >
            {isHintLoading
              ? "Thinking..."
              : canUseAiHints
                ? "Still stuck? Get another idea"
                : "Plus hint"}
          </button>
          {showAiHintPanel && stepHint ? (
            <p className="quest-v2-ai-hint">{stepHint}</p>
          ) : null}
        </div>
      ) : null}

      {isLastStep && isComplete && extensionIdeas.length > 0 ? (
        <div className="quest-v2-step-block">
          <h3>Finished early?</h3>
          <ul>
            {extensionIdeas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {isLastStep ? (
        <button type="button" className="quest-v2-finish" onClick={onFinish}>
          Finish activity
        </button>
      ) : null}
    </div>
  );
}

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
  stepHint,
  isHintLoading,
  handleNeedStepHint,
  canUseAiHints = true,
  formatTimer,
  playingChildren = [],
}) {
  const theme = getVisualThemeMeta(activeActivity.visualTheme);
  const mission = getActivityMissionText(activeActivity);
  const roleName = getActivityRoleLabel(activeActivity);
  const starterIdeas = getStarterIdeas(activeActivity);
  const steps = getStepDetails(activeActivity);
  const roles = Array.isArray(activeActivity.roles) ? activeActivity.roles : [];
  const extensionIdeas = Array.isArray(activeActivity.extensionIdeas)
    ? activeActivity.extensionIdeas
    : [];
  const questPhase = activeActivity.questPhase || "playing";
  const checkedStarterIndexes = Array.isArray(
    activeActivity.checkedStarterIndexes
  )
    ? activeActivity.checkedStarterIndexes
    : [];
  const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;
  const completedStepIndexes = Array.isArray(activeActivity.completedStepIndexes)
    ? activeActivity.completedStepIndexes
    : [];
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const currentStepIsComplete = completedStepIndexes.includes(currentStepIndex);
  const timerDone = timerSecondsRemaining <= 0;
  const instruction = resolveStepInstruction(
    currentStep,
    activeActivity.selectedRoleName || roleName,
    activeActivity.roleAssignments
  );

  function handleDoneNext() {
    if (!currentStepIsComplete) {
      toggleQuestStepComplete(currentStepIndex);
    }
    if (!isLastStep) {
      goToNextQuestStep();
    }
  }

  return (
    <section
      id="active-activity-panel"
      className="panel active-activity-panel pretend-active-panel quest-v2-panel"
      style={{ "--activity-theme-accent": theme.accent }}
    >
      <p className="simple-active-eyebrow">
        {theme.icon} {theme.label}
      </p>
      <h1 className="simple-active-title">{activeActivity.title}</h1>

      {INTRO_PHASES.includes(questPhase) ? (
        <>
          {questPhase === "world" ? (
            <IntroWorld
              activity={activeActivity}
              theme={theme}
              mission={mission}
              onContinue={() => setQuestPhase("role")}
            />
          ) : null}
          {questPhase === "role" ? (
            <IntroRole
              activity={activeActivity}
              roleName={roleName}
              roles={roles}
              playingChildren={playingChildren}
              roleAssignments={activeActivity.roleAssignments}
              onAssignRole={assignRole}
              onContinue={() => setQuestPhase("starters")}
              onBack={() => setQuestPhase("world")}
            />
          ) : null}
          {questPhase === "starters" ? (
            <IntroStarters
              starterIdeas={starterIdeas}
              checkedStarterIndexes={checkedStarterIndexes}
              onToggleStarter={toggleStarterIdea}
              onContinue={() => setQuestPhase("playing")}
              onBack={() => setQuestPhase("role")}
            />
          ) : null}
        </>
      ) : (
        <StepCard
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          instruction={instruction}
          isComplete={currentStepIsComplete}
          showBuiltInHelp={Boolean(activeActivity.showBuiltInHelp)}
          showAiHintPanel={Boolean(activeActivity.showAiHintPanel)}
          stepHint={stepHint}
          isHintLoading={isHintLoading}
          canUseAiHints={canUseAiHints}
          extensionIdeas={extensionIdeas}
          onToggleComplete={() => toggleQuestStepComplete(currentStepIndex)}
          onDoneNext={handleDoneNext}
          onBack={
            isFirstStep ? () => setQuestPhase("starters") : goToPreviousQuestStep
          }
          onToggleBuiltInHelp={toggleBuiltInHelp}
          onNeedStepHint={handleNeedStepHint}
          onFinish={finishActiveActivity}
          isLastStep={isLastStep}
          isFirstStep={false}
        />
      )}

      <div className="simple-active-actions quest-v2-global-actions">
        <button type="button" className="ghost-button" onClick={cancelActiveActivity}>
          Stop
        </button>
        {!INTRO_PHASES.includes(questPhase) ? (
          <button type="button" onClick={finishActiveActivity}>
            Done
          </button>
        ) : null}
      </div>

      <details className="quest-more-info">
        <summary>More</summary>
        <div className="quest-more-info-content">
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

          {Array.isArray(activeActivity.uses) && activeActivity.uses.length > 0 ? (
            <p className="uses-list">Uses: {activeActivity.uses.join(", ")}</p>
          ) : null}

          {currentMoment?.parentActivity ? (
            <p className="settings-note">
              Parent moment: {currentMoment.parentActivity}
            </p>
          ) : null}

          {timerDone ? (
            <div className="active-activity-actions">
              <button type="button" onClick={finishActiveActivity}>
                Yes, finished
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={handleTimerNotFinished}
              >
                Not really
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={handleTimerNeedAnotherIdea}
              >
                Need another idea
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={handleTimerMoreLikeThis}
              >
                More like this
              </button>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}

export default ActiveActivityPanel;
