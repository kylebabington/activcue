import { getVerifiedFitFacts, buildWhyThisFits } from "../utils/inventoryFit";

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
  toggleShowAllQuestSteps,
  stepHint,
  isHintLoading,
  handleNeedStepHint,
  canUseAiHints = true,
  formatTimer,
}) {
  const uses = Array.isArray(activeActivity.uses) ? activeActivity.uses : [];
  const steps = Array.isArray(activeActivity.steps) ? activeActivity.steps : [];
  const completedStepIndexes = Array.isArray(activeActivity.completedStepIndexes)
    ? activeActivity.completedStepIndexes
    : [];
  const timerDone = timerSecondsRemaining <= 0;
  const currentStepIndex = Number(activeActivity.currentStepIndex) || 0;
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const currentStepIsComplete = completedStepIndexes.includes(currentStepIndex);
  const fitFacts = getVerifiedFitFacts(activeActivity, currentMoment);
  const whyThisFits = buildWhyThisFits(activeActivity, currentMoment);

  return (
    <section
      id="active-activity-panel"
      className="panel active-activity-panel pretend-active-panel"
    >
      <p className="simple-active-eyebrow">Pretend activity</p>
      <h1 className="simple-active-title">{activeActivity.title}</h1>

      {activeActivity.theme && (
        <p className="activity-theme">{activeActivity.theme}</p>
      )}

      {activeActivity.summary && (
        <p className="simple-active-summary">{activeActivity.summary}</p>
      )}

      {whyThisFits ? <p className="why-this-fits">{whyThisFits}</p> : null}

      {fitFacts.length > 0 && (
        <div className="fit-fact-chip-row">
          {fitFacts.map((fact) => (
            <span key={fact} className="fit-fact-chip">
              {fact}
            </span>
          ))}
        </div>
      )}

      {steps.length > 0 && (
        <div className="simple-active-section guided-step-panel">
          <h2>
            Step {currentStepIndex + 1} of {totalSteps}
          </h2>

          <p className="guided-step-text">{currentStep}</p>

          <div className="guided-step-actions pretend-step-nav">
            <button
              type="button"
              className="secondary-action"
              onClick={goToPreviousQuestStep}
              disabled={isFirstStep}
            >
              Back
            </button>

            <button
              type="button"
              className={currentStepIsComplete ? "secondary-action" : ""}
              onClick={() => toggleQuestStepComplete(currentStepIndex)}
            >
              {currentStepIsComplete ? "Undo step" : "Mark step done"}
            </button>

            <button
              type="button"
              onClick={goToNextQuestStep}
              disabled={isLastStep}
            >
              {isLastStep ? "Last step" : "Next step"}
            </button>
          </div>

          {stepHint && (
            <div className="simple-active-hint">
              <h2>Hint</h2>
              <p>{stepHint}</p>
            </div>
          )}
        </div>
      )}

      <div className="simple-active-actions">
        <button
          type="button"
          className={canUseAiHints ? undefined : "hint-button--plus"}
          onClick={handleNeedStepHint}
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
              ? "Need a hint"
              : "Plus hint"}
        </button>

        <button type="button" onClick={finishActiveActivity}>
          Done
        </button>

        <button type="button" onClick={cancelActiveActivity}>
          Stop
        </button>
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

          {uses.length > 0 && (
            <p className="uses-list">Uses: {uses.join(", ")}</p>
          )}

          {activeActivity.kidRole && (
            <div className="quest-box active-quest-box">
              <h3>Your role</h3>
              <p>{activeActivity.kidRole}</p>
            </div>
          )}

          {activeActivity.mission && (
            <div className="quest-box active-quest-box">
              <h3>Your story</h3>
              <p>{activeActivity.mission}</p>
            </div>
          )}

          <button
            type="button"
            className="secondary-action"
            onClick={toggleShowAllQuestSteps}
          >
            {activeActivity.showAllSteps ? "Hide all steps" : "Show all steps"}
          </button>

          {activeActivity.showAllSteps && steps.length > 0 && (
            <ol className="tracked-step-list">
              {steps.map((step, index) => {
                const stepIsComplete = completedStepIndexes.includes(index);

                return (
                  <li key={`${step}-${index}`}>
                    <button
                      type="button"
                      className={
                        stepIsComplete
                          ? "step-complete-toggle done"
                          : "step-complete-toggle"
                      }
                      onClick={() => toggleQuestStepComplete(index)}
                    >
                      {stepIsComplete ? "Done" : "To do"}
                    </button>
                    <span>{step}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {timerDone && (
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
          )}
        </div>
      </details>
    </section>
  );
}

export default ActiveActivityPanel;
