function ActivityHistoryPanel({
  activityHistory,
  clearActivityHistory,
  formatFeedbackLabel,
}) {
  if (activityHistory.length === 0) {
    return null;
  }

  return (
    <section className="panel activity-history-panel">
      <div className="panel-header">
        <div>
          <h2>Activity History</h2>
          <p>A log of recent activity sessions and feedback.</p>
        </div>

        <button className="ghost-button" onClick={clearActivityHistory}>
          Clear history
        </button>
      </div>

      <div className="activity-history-list">
        {activityHistory
          .slice()
          .reverse()
          .map((item, index) => (
            <article key={index} className="activity-history-item">
              <div>
                <h3>{item.title}</h3>
                <span className="activity-history-feedback-badge">
                  {formatFeedbackLabel(item.feedbackType)}
                </span>
              </div>

              <p className="activity-history-timestamp">
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </article>
          ))}
      </div>
    </section>
  );
}

export default ActivityHistoryPanel;
