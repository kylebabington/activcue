function formatEstimatedMinutes(estimatedMinutes) {
  // If estimatedMinutes is not a real number, do not show a badge.
  if (typeof estimatedMinutes !== "number") {
    return null;
  }

  // Avoid weird labels like "0 min".
  if (estimatedMinutes < 1) {
    return null;
  }

  // Round to keep the UI clean.
  return `${Math.round(estimatedMinutes)} min quest`;
}

function formatMessLabel(mess) {
  // Convert backend values into friendly display text.
  if (mess === "low") {
    return "Low mess";
  }

  if (mess === "medium") {
    return "Medium mess";
  }

  if (mess === "high") {
    return "Messy";
  }

  return null;
}

function formatEnergyLabel(energy) {
  // Convert backend values into kid/parent-friendly display text.
  if (energy === "low") {
    return "Calm";
  }

  if (energy === "medium") {
    return "Active";
  }

  if (energy === "high") {
    return "High energy";
  }

  return null;
}

function formatAdultHelpLabel(adultHelp) {
  // Convert backend values into friendly display text.
  if (adultHelp === "none") {
    return "No adult help";
  }

  if (adultHelp === "optional") {
    return "Adult optional";
  }

  if (adultHelp === "needed") {
    return "Adult needed";
  }

  return null;
}

function ActiveActivityPanel({
  activeActivity,
  timerSecondsRemaining,
  finishActiveActivity,
  cancelActiveActivity,
  handleTimerNotFinished,
  handleTimerNeedAnotherIdea,
  handleTimerMoreLikeThis,
  goToNextQuestStep,
  goToPreviousQuestStep,
  toggleShowAllQuestSteps,
  formatTimer,
}) {
  // Make sure uses is always an array before rendering it.
  const uses = Array.isArray(activeActivity.uses) ? activeActivity.uses : [];

  // Make sure steps is always an array before using it.
  const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];

  // The timer is done when seconds remaining hits zero or below.
  const timerDone = timerSecondsRemaining <= 0;

  // currentStepIndex tells us which step the kid is currently viewing.
  const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;

  // currentStep is the actual instruction text for the current step.
  const currentStep = steps[currentStepIndex];

  // totalSteps is used for labels like "Step 2 of 5".
  const totalSteps = steps.length;

  // These booleans help us enable/disable navigation buttons.
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Convert raw activity values into friendly badge labels.
  const estimatedMinutesLabel = formatEstimatedMinutes(
    activeActivity.estimatedMinutes
  );
  const messLabel = formatMessLabel(activeActivity.mess);
  const energyLabel = formatEnergyLabel(activeActivity.energy);
  const adultHelpLabel = formatAdultHelpLabel(activeActivity.adultHelp);

  return (
    <section
      id="active-activity-panel"
      className="panel active-activity-panel"
    >
      <div className="active-activity-header">
        <div>
          <p className="eyebrow dark">Current Quest</p>
          <h2>{activeActivity.title}</h2>

          {activeActivity.theme && (
            <p className="activity-theme">{activeActivity.theme}</p>
          )}

          {activeActivity.summary && <p>{activeActivity.summary}</p>}

          <div className="active-fit-badges">
            {estimatedMinutesLabel && <span>{estimatedMinutesLabel}</span>}

            {messLabel && <span>{messLabel}</span>}

            {energyLabel && <span>{energyLabel}</span>}

            {adultHelpLabel && <span>{adultHelpLabel}</span>}

            {uses.length > 0 && <span>Uses: {uses.slice(0, 3).join(", ")}</span>}
          </div>
        </div>

        <div
          className={timerDone ? "timer-badge done" : "timer-badge"}
          aria-live="polite"
          aria-label={
            timerDone
              ? "Activity timer finished"
              : `Time left: ${formatTimer(timerSecondsRemaining)}`
          }
        >
          <span className="timer-label">
            {timerDone ? "Timer" : "Time left"}
          </span>
          <span className="timer-value">
            {timerDone ? "Done!" : formatTimer(timerSecondsRemaining)}
          </span>
        </div>
      </div>

      {activeActivity.kidMission && (
        <div className="kid-mission-box active-mission-box">
          <h3>Kid mission</h3>
          <p>{activeActivity.kidMission}</p>
        </div>
      )}

      {activeActivity.kidRole && (
        <div className="quest-box active-quest-box">
          <h3>Your role</h3>
          <p>{activeActivity.kidRole}</p>
        </div>
      )}

      {activeActivity.mission && (
        <div className="quest-box active-quest-box">
          <h3>Your mission</h3>
          <p>{activeActivity.mission}</p>
        </div>
      )}

      {Array.isArray(activeActivity.starterPrompts) &&
        activeActivity.starterPrompts.length > 0 && (
          <div className="quest-box active-quest-box">
            <h3>Starter prompts</h3>
            <ul>
              {activeActivity.starterPrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          </div>
        )}

      {Array.isArray(activeActivity.firstMoves) &&
        activeActivity.firstMoves.length > 0 && (
          <div className="quest-box active-quest-box">
            <h3>First moves</h3>
            <ol>
              {activeActivity.firstMoves.map((move) => (
                <li key={move}>{move}</li>
              ))}
            </ol>
          </div>
        )}

      {Array.isArray(activeActivity.roles) &&
        activeActivity.roles.length > 0 && (
          <div className="quest-box active-quest-box">
            <h3>Roles</h3>
            <ul>
              {activeActivity.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
        )}

      {steps.length > 0 && (
        <div className="guided-step-panel">
          <div className="guided-step-header">
            <div>
              <p className="eyebrow dark">Guided step</p>

              <h3>
                Step {currentStepIndex + 1} of {totalSteps}
              </h3>
            </div>

            <button
              className="secondary-action"
              onClick={toggleShowAllQuestSteps}
            >
              {activeActivity.showAllSteps ? "Hide all steps" : "Show all steps"}
            </button>
          </div>

          <p className="guided-step-text">{currentStep}</p>

          <div className="guided-step-actions">
            <button
              className="secondary-action"
              onClick={goToPreviousQuestStep}
              disabled={isFirstStep}
            >
              Back
            </button>

            <button onClick={goToNextQuestStep} disabled={isLastStep}>
              {isLastStep ? "Last step" : "Done with this step"}
            </button>
          </div>

          {activeActivity.showAllSteps && (
            <div className="mission-steps all-steps-list">
              <h3>All quest steps</h3>

              <ol>
                {steps.map((step, index) => (
                  <li
                    key={step}
                    className={
                      index === currentStepIndex ? "current-step-item" : ""
                    }
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {Array.isArray(activeActivity.extensionIdeas) &&
        activeActivity.extensionIdeas.length > 0 && (
          <div className="quest-box active-quest-box">
            <h3>Keep going</h3>
            <ul>
              {activeActivity.extensionIdeas.map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>
          </div>
        )}

      {activeActivity.whyItFits && (
        <div className="quest-box active-quest-box why-it-fits-box">
          <h3>Why this fits right now</h3>
          <p>{activeActivity.whyItFits}</p>
        </div>
      )}

      {uses.length > 0 && (
        <p className="uses-list">Uses: {uses.join(", ")}</p>
      )}

      <div className="active-activity-actions">
        {!timerDone ? (
          <>
            <button onClick={finishActiveActivity}>Finished Early</button>

            <button className="danger-button" onClick={cancelActiveActivity}>
              Cancel Mission
            </button>
          </>
        ) : (
          <>
            <button onClick={finishActiveActivity}>Yes, finished</button>

            <button className="secondary-action" onClick={handleTimerNotFinished}>
              Not really
            </button>

            <button className="secondary-action" onClick={handleTimerNeedAnotherIdea}>
              Need another idea
            </button>

            <button className="secondary-action" onClick={handleTimerMoreLikeThis}>
              More like this
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export default ActiveActivityPanel;