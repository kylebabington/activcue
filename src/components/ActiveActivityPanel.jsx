function ActiveActivityPanel({
  activeActivity,
  timerSecondsRemaining,
  finishActiveActivity,
  cancelActiveActivity,
  handleTimerNotFinished,
  handleTimerNeedAnotherIdea,
  handleTimerMoreLikeThis,
  formatTimer,
}) {
  const uses = Array.isArray(activeActivity.uses) ? activeActivity.uses : [];
  const timerDone = timerSecondsRemaining <= 0;

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

          <p>{activeActivity.summary}</p>
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

      <div className="mission-steps">
        <h3>Quest steps</h3>

        <ol>
          {(Array.isArray(activeActivity.steps) ? activeActivity.steps : []).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

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
