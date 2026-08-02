// src/pages/settings/SettingsPreferencesTab.jsx

import ThemeSwitcher from "../../components/ThemeSwitcher";

export default function SettingsPreferencesTab({
  safetySettings,
  toggleSafetySetting,
  updateSafetySetting,
  uiTheme,
  setUiTheme,
  uiThemes,
  kidDeviceMode,
  setKidDeviceMode,
}) {
  return (
    <div
      className="settings-tab-panel"
      role="tabpanel"
      id="settings-panel-preferences"
      aria-labelledby="settings-tab-preferences"
    >
      <section className="panel safety-panel">
        <div className="panel-header">
          <div>
            <h2>Activity Rules</h2>
            <p>These rules tell the AI what not to suggest.</p>
            <p className="settings-note">
              Current moment can tighten time and quiet while it is active.
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
                ? "AI avoids screens"
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
                ? "AI avoids food"
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
                ? "AI avoids water play"
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
                ? "AI avoids choking-sized items"
                : "Small items may be suggested"}
            </small>
          </button>

          <button
            type="button"
            className={safetySettings.quietMode ? "enabled" : ""}
            onClick={() => toggleSafetySetting("quietMode")}
          >
            <span>Quiet mode</span>
            <small>
              {safetySettings.quietMode
                ? "AI suggests quiet ideas"
                : "Normal noise allowed"}
            </small>
          </button>
        </div>

        <div className="safety-controls-grid">
          <label>
            Max activity time
            <select
              value={safetySettings.maxActivityMinutes}
              onChange={(event) =>
                updateSafetySetting(
                  "maxActivityMinutes",
                  Number(event.target.value)
                )
              }
            >
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>

          <label>
            Adult help allowed?
            <select
              value={safetySettings.adultHelpAllowed}
              onChange={(event) =>
                updateSafetySetting("adultHelpAllowed", event.target.value)
              }
            >
              <option value="none">No adult help</option>
              <option value="optional">Optional adult help</option>
              <option value="needed">Adult help is okay</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel theme-settings-panel">
        <div className="panel-header">
          <div>
            <h2>Look & feel</h2>
            <p>
              Themes change play character, not just colors — Storybook
              leans into longer pretend, Workshop builds from inventory,
              Playroom favors short energy bursts.
            </p>
          </div>
        </div>

        <ThemeSwitcher
          theme={uiTheme}
          onChange={setUiTheme}
          themes={uiThemes}
        />

        <div className="kid-device-mode-toggle">
          <label className="settings-toggle-row">
            <input
              type="checkbox"
              checked={Boolean(kidDeviceMode)}
              onChange={(event) => setKidDeviceMode(event.target.checked)}
            />
            <span>
              Kid-device mode
              <small>
                Hides theme switcher and account links in the header.
                Parent and Settings stay PIN-protected. Tip: open with
                ?kid=1
              </small>
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}
