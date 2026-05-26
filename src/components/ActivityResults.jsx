function ActivityResults({
  activities,
  isLoading,
  handleStartActivity,
  saveFavoriteActivity,
  handleTooMessy,
  handleTooHard,
  handleNeedQuieter,
  handleMoreLikeThis,
}) {
  if (isLoading) {
    return (
      <section className="panel loading-panel">
        <h2>Thinking up ideas...</h2>
        <p>Finding something that fits your home, supplies, and parent status.</p>
      </section>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <section className="panel results-panel">
      <h2>Activity Ideas</h2>

      <div className="activity-grid">
        {activities.map((activity) => (
          <article key={activity.title} className="activity-card">
            <h3>{activity.title}</h3>

            {activity.theme && (
              <p className="activity-theme">{activity.theme}</p>
            )}

            <p>{activity.summary}</p>

            {activity.kidRole && (
              <div className="quest-box role-box">
                <h4>Your role</h4>
                <p>{activity.kidRole}</p>
              </div>
            )}

            {activity.mission && (
              <div className="quest-box mission-box">
                <h4>Your mission</h4>
                <p>{activity.mission}</p>
              </div>
            )}

            {Array.isArray(activity.starterPrompts) &&
              activity.starterPrompts.length > 0 && (
                <div className="quest-box prompt-box">
                  <h4>Starter prompts</h4>

                  <ul>
                    {activity.starterPrompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                </div>
              )}

            {Array.isArray(activity.firstMoves) &&
              activity.firstMoves.length > 0 && (
                <div className="quest-box first-moves-box">
                  <h4>First moves</h4>

                  <ol>
                    {activity.firstMoves.map((move) => (
                      <li key={move}>{move}</li>
                    ))}
                  </ol>
                </div>
              )}

            {Array.isArray(activity.roles) && activity.roles.length > 0 && (
              <div className="quest-box roles-box">
                <h4>Roles</h4>

                <ul>
                  {activity.roles.map((role) => (
                    <li key={role}>{role}</li>
                  ))}
                </ul>
              </div>
            )}

            <h4>Quest steps</h4>
            <ol>
              {(Array.isArray(activity.steps) ? activity.steps : []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            {Array.isArray(activity.extensionIdeas) &&
              activity.extensionIdeas.length > 0 && (
                <div className="quest-box extension-box">
                  <h4>Keep going</h4>

                  <ul>
                    {activity.extensionIdeas.map((idea) => (
                      <li key={idea}>{idea}</li>
                    ))}
                  </ul>
                </div>
              )}

            <div className="activity-meta">
              <span>Energy: {activity.energy}</span>
              <span>Mess: {activity.mess}</span>
              <span>Adult help: {activity.adultHelp}</span>
            </div>

            <p className="why-it-fits">{activity.whyItFits}</p>

            {Array.isArray(activity.uses) && activity.uses.length > 0 && (
              <p className="uses-list">Uses: {activity.uses.join(", ")}</p>
            )}

            <div className="feedback-buttons">
              <button onClick={() => handleStartActivity(activity)}>
                Start this
              </button>

              <button onClick={() => saveFavoriteActivity(activity)}>
                Save
              </button>

              <button onClick={() => handleTooMessy(activity)}>Too messy</button>

              <button onClick={() => handleTooHard(activity)}>Too hard</button>

              <button onClick={() => handleNeedQuieter(activity)}>
                Need quieter
              </button>

              <button onClick={() => handleMoreLikeThis(activity)}>
                More like this
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ActivityResults;
