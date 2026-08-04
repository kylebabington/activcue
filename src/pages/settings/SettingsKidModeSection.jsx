// src/pages/settings/SettingsKidModeSection.jsx

export default function SettingsKidModeSection({
  kidDeviceMode,
  setKidDeviceMode,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Kid Mode</h2>
          <p>Give a child a simpler version of FamilyFlow on this device.</p>
        </div>
      </div>

      <label className="settings-toggle-row">
        <input
          type="checkbox"
          checked={Boolean(kidDeviceMode)}
          onChange={(event) => setKidDeviceMode(event.target.checked)}
        />
        <span>
          Enable Kid Mode
          <small>
            Hides account and theme controls in the header. Parent, Settings,
            and My Activities stay behind the Parent PIN when one is set. Tip:
            open with ?kid=1
          </small>
        </span>
      </label>
    </section>
  );
}
