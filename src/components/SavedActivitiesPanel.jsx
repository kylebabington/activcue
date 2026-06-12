// src/components/SavedActivitiesPanel.jsx

import { formatActivityStyleLabel } from "../utils/activityFormatters";

// This component shows activities the family saved for later.
//
// Product idea:
// Saved activities are not just "favorites."
// They are a reusable family library:
// "This worked before. Do it again."
function SavedActivitiesPanel({
  savedActivities,
  handleReplaySavedActivity,
  removeSavedActivity,
}) {
  // If nothing has been saved yet, do not show an empty panel.
  // This keeps Settings cleaner.
  if (savedActivities.length === 0) {
    return null;
  }

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

      <div className="saved-activity-list">
        {savedActivities
          // Make a copy before reversing.
          //
          // Why?
          // .reverse() mutates the original array.
          // We do not want to mutate React state directly.
          .slice()
          .reverse()
          .map((activity) => {
            // Older saved activities may not have activityStyle yet.
            //
            // For safety, default old saved items to "simple".
            // Simple is the safer fallback because it avoids overwhelming UI.
            const activityStyle = activity.activityStyle || "simple";

            // This boolean controls whether we hide pretend/quest-style fields.
            const isSimpleActivity = activityStyle === "simple";

            // Convert "simple" into "Simple"
            // and "imaginative" into whatever your formatter returns,
            // probably "Pretend" or "Imaginative".
            const activityStyleLabel = formatActivityStyleLabel(activityStyle);

            // Defensive array cleanup.
            // If old saved data is missing uses or steps, the UI still works.
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
                    Replay activity
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