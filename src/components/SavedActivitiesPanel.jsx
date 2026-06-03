function SavedActivitiesPanel({
  savedActivities,
  handleStartActivity,
  handleReplaySavedActivity,
  removeSavedActivity,
}) {
  if (savedActivities.length === 0) {
    return null;
  }

  return (
    <section className="panel saved-activities-panel">
      <div className="panel-header">
        <div>
          <h2>Saved Activities</h2>
          <p>
            These are quests that worked well enough to keep. Replay one anytime
            without waiting for a new AI suggestion.
          </p>
        </div>
      </div>

      <div className="saved-activity-list">
        {savedActivities
          .slice()
          .reverse()
          .map((activity) => {
            const uses = Array.isArray(activity.uses) ? activity.uses : [];
            const steps = Array.isArray(activity.steps) ? activity.steps : [];

            return (
              <article key={activity.id} className="saved-activity-item">
                <div>
                  <h3>{activity.title}</h3>

                  {activity.theme && (
                    <p className="activity-theme">{activity.theme}</p>
                  )}

                  {activity.summary && <p>{activity.summary}</p>}

                  <div className="activity-meta compact-meta">
                    {activity.estimatedMinutes && (
                      <span>{Math.round(activity.estimatedMinutes)} min</span>
                    )}

                    {steps.length > 0 && <span>{steps.length} steps</span>}

                    {activity.mess && <span>Mess: {activity.mess}</span>}

                    {activity.energy && <span>Energy: {activity.energy}</span>}

                    {activity.adultHelp && (
                      <span>Adult help: {activity.adultHelp}</span>
                    )}
                  </div>

                  {uses.length > 0 && (
                    <p className="uses-list">
                      Uses: {uses.join(", ")}
                    </p>
                  )}
                </div>

                <div className="saved-activity-actions">
                  <button onClick={() => handleReplaySavedActivity(activity)}>
                    Replay quest
                  </button>

                  <button
                    className="danger-button"
                    onClick={() => removeSavedActivity(activity.id)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}

export default SavedActivitiesPanel;