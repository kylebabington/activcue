// src/pages/settings/SettingsParentPinSection.jsx

export default function SettingsParentPinSection({
  parentPin,
  ParentPinForm,
  saveParentPin,
}) {
  return (
    <section className="panel pin-settings-panel">
      <div className="panel-header">
        <div>
          <h2>Parent PIN</h2>
          <p>
            Require a PIN before opening parent-only areas on this device.
          </p>
        </div>
      </div>

      <ParentPinForm parentPin={parentPin} saveParentPin={saveParentPin} />

      <p className="settings-note">
        This PIN prevents children from casually opening parent controls. It is
        not your account password.
      </p>
    </section>
  );
}
