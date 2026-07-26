// src/components/SavedActivitiesPanel.jsx

import { formatActivityStyleLabel } from "../utils/activityFormatters";

function SavedActivitiesPanel({
  savedActivities,
  handleReplaySavedActivity,
  removeSavedActivity,
}) {
  return (
    <section className="panel saved-activities-panel">
      <div className="panel-header">
        <div>
          <h2>Saved Activities</h2>

          <p>
            These are activities that worked well enough to keep. Replay one
            anytime without waiting for a new AI suggestion.
          </p>
        </div>
      </div>

      {savedActivities.length === 0 ? (
        <p className="empty-text">No saved activities yet.</p>
      ) : (
        <div className="saved-activity-list">
          {savedActivities
            .slice()
            .reverse()
            .map((activity) => {
              const activityStyle = activity.activityStyle || "simple";
              const isSimpleActivity = activityStyle === "simple";
              const activityStyleLabel = formatActivityStyleLabel(activityStyle);
              const uses = Array.isArray(activity.uses) ? activity.uses : [];
              const steps = Array.isArray(activity.steps) ? activity.steps : [];

              return (
                <article key={activity.id} className="saved-activity-item">
                  <div className="saved-activity-content">
                    <div className="quest-card-topline">
                      <span
                        className={
                          isSimpleActivity
                            ? "activity-style-badge simple-style-badge"
                            : "activity-style-badge pretend-style-badge"
                        }
                      >
                        {activityStyleLabel}
                      </span>
                    </div>

                    <h3>{activity.title}</h3>

                    {!isSimpleActivity && activity.theme && (
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
                      <p className="uses-list">Uses: {uses.join(", ")}</p>
                    )}
                  </div>

                  <div className="saved-activity-actions">
                    <button onClick={() => handleReplaySavedActivity(activity)}>
                      Play again
                    </button>

                    <button
                      className="danger-button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Remove saved activity "${activity.title}"?`
                        );
                        if (confirmed) {
                          removeSavedActivity(activity.id);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
      )}
    </section>
  );
}

export default SavedActivitiesPanel;
