function ActivityHistoryPanel({
  activityHistory,
  clearActivityHistory,
  formatFeedbackLabel,
}) {
  return (
    <section className="panel activity-history-panel">
      <div className="panel-header">
        <div>
          <h2>Activity History</h2>
          <p>A log of recent activity sessions and feedback.</p>
        </div>

        {activityHistory.length > 0 && (
          <button className="ghost-button" onClick={clearActivityHistory}>
            Clear history
          </button>
        )}
      </div>

      {activityHistory.length === 0 ? (
        <p className="empty-text">No activity history yet.</p>
      ) : (
        <div className="activity-history-list">
          {activityHistory
            .slice()
            .reverse()
            .map((item) => (
              <article key={item.id || item.createdAt} className="activity-history-item">
                <div>
                  <h3>{item.title}</h3>
                  <span className="activity-history-feedback-badge">
                    {formatFeedbackLabel(item.feedbackType)}
                  </span>
                  {item.childName && (
                    <span className="activity-history-child">
                      {item.childName}
                    </span>
                  )}
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
      )}
    </section>
  );
}

export default ActivityHistoryPanel;
