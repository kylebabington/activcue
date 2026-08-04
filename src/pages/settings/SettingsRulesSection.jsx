// src/pages/settings/SettingsRulesSection.jsx

export default function SettingsRulesSection({
  safetySettings,
  toggleSafetySetting,
}) {
  return (
    <section className="panel safety-panel">
      <div className="panel-header">
        <div>
          <h2>Activity rules</h2>
          <p>Permanent filters for what FamilyFlow should never suggest.</p>
          <p className="settings-note">
            Time, quiet, and adult help stay on Current Moment — they change
            throughout the day.
          </p>
        </div>
      </div>

      <div className="safety-toggle-grid">
        <button
          type="button"
          className={safetySettings.screenFreeOnly ? "enabled" : ""}
          onClick={() => toggleSafetySetting("screenFreeOnly")}
        >
          <span>Screen-free only</span>
          <small>
            {safetySettings.screenFreeOnly
              ? "Never suggest screens"
              : "Screens may be suggested"}
          </small>
        </button>

        <button
          type="button"
          className={safetySettings.noFoodActivities ? "enabled" : ""}
          onClick={() => toggleSafetySetting("noFoodActivities")}
        >
          <span>No food activities</span>
          <small>
            {safetySettings.noFoodActivities
              ? "Never suggest food"
              : "Food may be suggested"}
          </small>
        </button>

        <button
          type="button"
          className={safetySettings.noWaterPlay ? "enabled" : ""}
          onClick={() => toggleSafetySetting("noWaterPlay")}
        >
          <span>No water play</span>
          <small>
            {safetySettings.noWaterPlay
              ? "Never suggest water play"
              : "Water play may be suggested"}
          </small>
        </button>

        <button
          type="button"
          className={safetySettings.noSmallObjects ? "enabled" : ""}
          onClick={() => toggleSafetySetting("noSmallObjects")}
        >
          <span>No small objects</span>
          <small>
            {safetySettings.noSmallObjects
              ? "Avoid choking-sized pieces"
              : "Small items may be suggested"}
          </small>
        </button>
      </div>
    </section>
  );
}
