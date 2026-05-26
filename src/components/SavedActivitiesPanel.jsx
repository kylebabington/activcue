function SavedActivitiesPanel({
  savedActivities,
  handleStartActivity,
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
            These are ideas that worked well enough to keep. Start one again
            anytime.
          </p>
        </div>
      </div>

      <div className="saved-activity-list">
        {savedActivities
          .slice()
          .reverse()
          .map((activity) => (
            <article key={activity.id} className="saved-activity-item">
              <div>
                <h3>{activity.title}</h3>
                <p>{activity.summary}</p>

                {activity.uses.length > 0 && (
                  <p className="uses-list">
                    Uses: {activity.uses.join(", ")}
                  </p>
                )}
              </div>

              <div className="saved-activity-actions">
                <button onClick={() => handleStartActivity(activity)}>
                  Start
                </button>

                <button
                  className="danger-button"
                  onClick={() => removeSavedActivity(activity.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

export default SavedActivitiesPanel;
