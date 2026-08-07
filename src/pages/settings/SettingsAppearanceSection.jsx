// src/pages/settings/SettingsAppearanceSection.jsx

import ThemeSwitcher from "../../components/ThemeSwitcher";

export default function SettingsAppearanceSection({
  uiTheme,
  setUiTheme,
  uiThemes,
}) {
  return (
    <section className="panel theme-settings-panel">
      <div className="panel-header">
        <div>
          <h2>Appearance</h2>
          <p>
            Choose how ActivCue looks. This changes colors and character —
            not which activities get recommended.
          </p>
        </div>
      </div>

      <ThemeSwitcher theme={uiTheme} onChange={setUiTheme} themes={uiThemes} />
    </section>
  );
}
