// src/pages/settings/SettingsDefaultsSection.jsx

export default function SettingsDefaultsSection({
  activityPreferences,
  updateActivityPreference,
}) {
  const prefs = activityPreferences || {};

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Default activity preferences</h2>
          <p>
            Typical preferences for your family. Current Moment can override
            these when you set a moment on the Parent page.
          </p>
        </div>
      </div>

      <fieldset className="settings-choice-group">
        <legend>Typical mess tolerance</legend>
        {[
          { value: "clean", label: "Keep it clean" },
          { value: "a-little", label: "A little mess is fine" },
          { value: "fine", label: "Mess does not bother us" },
        ].map((option) => (
          <label key={option.value} className="settings-choice-row">
            <input
              type="radio"
              name="messTolerance"
              checked={prefs.messTolerance === option.value}
              onChange={() =>
                updateActivityPreference("messTolerance", option.value)
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="settings-choice-group">
        <legend>Typical setup preference</legend>
        {[
          { value: "almost-none", label: "Almost no setup" },
          { value: "a-few-minutes", label: "A few minutes is okay" },
          { value: "bigger-ok", label: "Bigger setup activities are fine" },
        ].map((option) => (
          <label key={option.value} className="settings-choice-row">
            <input
              type="radio"
              name="setupEffort"
              checked={prefs.setupEffort === option.value}
              onChange={() =>
                updateActivityPreference("setupEffort", option.value)
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="settings-choice-group">
        <legend>Usually prioritize activities that are</legend>
        {[
          { value: "parent-led", label: "Parent-led" },
          { value: "together", label: "Together" },
          { value: "mostly-independent", label: "Mostly independent" },
          { value: "fully-independent", label: "Fully independent" },
        ].map((option) => (
          <label key={option.value} className="settings-choice-row">
            <input
              type="radio"
              name="independencePreference"
              checked={prefs.independencePreference === option.value}
              onChange={() =>
                updateActivityPreference(
                  "independencePreference",
                  option.value
                )
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="settings-choice-group">
        <legend>Activity style</legend>
        {[
          { value: "mostly-simple", label: "Mostly simple" },
          { value: "mix", label: "Mix it up" },
          { value: "mostly-imaginative", label: "Mostly imaginative" },
        ].map((option) => (
          <label key={option.value} className="settings-choice-row">
            <input
              type="radio"
              name="activityStylePreference"
              checked={prefs.activityStylePreference === option.value}
              onChange={() =>
                updateActivityPreference(
                  "activityStylePreference",
                  option.value
                )
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="settings-choice-group">
        <legend>Usually prefer</legend>
        {[
          { value: "indoor", label: "Indoor" },
          { value: "outdoor", label: "Outdoor" },
          { value: "either", label: "Either" },
        ].map((option) => (
          <label key={option.value} className="settings-choice-row">
            <input
              type="radio"
              name="indoorOutdoorPreference"
              checked={prefs.indoorOutdoorPreference === option.value}
              onChange={() =>
                updateActivityPreference(
                  "indoorOutdoorPreference",
                  option.value
                )
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
