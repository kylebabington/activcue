// src/pages/settings/SettingsDataPrivacySection.jsx

export default function SettingsDataPrivacySection({
  clearActivityHistory,
  resetLearnedRecommendations,
  activityHistoryCount = 0,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Data &amp; privacy</h2>
          <p>Clear history or reset what ActivCue has learned — without deleting children or supplies.</p>
        </div>
      </div>

      <div className="settings-data-actions">
        <div className="settings-data-action">
          <div>
            <strong>Clear activity history</strong>
            <p>
              Remove the list of past activities
              {activityHistoryCount > 0
                ? ` (${activityHistoryCount} items)`
                : ""}
              . Saved activities stay.
            </p>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={clearActivityHistory}
          >
            Clear activity history
          </button>
        </div>

        <div className="settings-data-action">
          <div>
            <strong>Reset what ActivCue has learned</strong>
            <p>
              Clears recommendation history patterns and personalization
              signals. Children, supplies, account, and subscription stay.
            </p>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={resetLearnedRecommendations}
          >
            Reset learned recommendations
          </button>
        </div>
      </div>
    </section>
  );
}
