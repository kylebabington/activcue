// src/pages/settings/SettingsKidModeSection.jsx

import { BRAND } from "../../config/brand.js";
import { SPEECH_RATE_SLOW } from "../../utils/readingMode";

export default function SettingsKidModeSection({
  kidDeviceMode,
  setKidDeviceMode,
  readingModePreference,
  setReadingModePreference,
  updateReadingModeSettings,
}) {
  const useAgeDefaults = readingModePreference == null;
  const enabled = useAgeDefaults
    ? true
    : Boolean(readingModePreference?.enabled);
  const autoAdvance = useAgeDefaults
    ? true
    : Boolean(readingModePreference?.autoAdvance);
  const speechSpeed =
    !useAgeDefaults &&
    (readingModePreference?.speechSpeed === "slow" ||
      Number(readingModePreference?.speechRate) === SPEECH_RATE_SLOW)
      ? "slow"
      : "normal";

  function handleUseAgeDefaultsChange(checked) {
    if (checked) {
      setReadingModePreference?.(null);
      return;
    }
    updateReadingModeSettings?.({
      useAgeDefaults: false,
      enabled,
      autoAdvance,
      speechSpeed,
    });
  }

  function handleEnabledChange(checked) {
    updateReadingModeSettings?.({
      useAgeDefaults: false,
      enabled: checked,
      autoAdvance,
      speechSpeed,
    });
  }

  function handleAutoAdvanceChange(checked) {
    updateReadingModeSettings?.({
      useAgeDefaults: false,
      enabled,
      autoAdvance: checked,
      speechSpeed,
    });
  }

  function handleSpeechSpeedChange(nextSpeed) {
    updateReadingModeSettings?.({
      useAgeDefaults: false,
      enabled,
      autoAdvance,
      speechSpeed: nextSpeed,
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Kid Mode</h2>
          <p>Give a child a simpler version of {BRAND.name} on this device.</p>
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

      <div className="settings-subsection">
        <h3>Listening Mode</h3>
        <p className="settings-subsection-lede">
          Read activities aloud with the browser voice. Available to everyone —
          great for younger kids who are still learning to read.
        </p>

        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={useAgeDefaults}
            onChange={(event) =>
              handleUseAgeDefaultsChange(event.target.checked)
            }
          />
          <span>
            Use age-based defaults
            <small>
              On by default for kids 9 and under. Older kids can turn Listening
              Mode on during an activity.
            </small>
          </span>
        </label>

        {!useAgeDefaults ? (
          <>
            <label className="settings-toggle-row">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => handleEnabledChange(event.target.checked)}
              />
              <span>
                Enable Listening Mode by default
                <small>
                  Shows one big instruction at a time with Tell me what to do
                  and I did it.
                </small>
              </span>
            </label>

            <label className="settings-toggle-row">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(event) =>
                  handleAutoAdvanceChange(event.target.checked)
                }
              />
              <span>
                Auto-read the next step
                <small>
                  After I did it, automatically read the next instruction.
                </small>
              </span>
            </label>

            <label className="settings-field">
              <span>Speech speed</span>
              <select
                value={speechSpeed}
                onChange={(event) =>
                  handleSpeechSpeedChange(event.target.value)
                }
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
              </select>
            </label>
          </>
        ) : null}
      </div>
    </section>
  );
}
