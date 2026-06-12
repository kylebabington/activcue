// src/pages/ParentPage.jsx

import { Link } from "react-router-dom";

function ParentPage({
  parentStatus,
  setParentStatus,
  currentMoment,
  updateCurrentMoment,
  applyCurrentMomentQuickAdjust,
  defaultParentStatusPresets,
  customParentPresets,
  applyParentStatusPreset,
  getAvailabilityLabel,
}) {
  function getMomentValue(fieldName, fallbackText = "Not set") {
    return currentMoment?.[fieldName] || fallbackText;
  }

  function quickChipClass(fieldName, expectedValue) {
    const isActive = currentMoment?.[fieldName] === expectedValue;
    return isActive ? "quick-chip active" : "quick-chip";
  }

  function applyMomentChip(adjustment) {
    applyCurrentMomentQuickAdjust(adjustment);
  }

  function updateParentActivity(newActivity) {
    updateCurrentMoment("parentActivity", newActivity);
    setParentStatus({
      ...parentStatus,
      activity: newActivity,
    });
  }

  function updateAvailability(newAvailability) {
    updateCurrentMoment("availability", newAvailability);
    setParentStatus({
      ...parentStatus,
      availability: newAvailability,
    });
  }

  return (
    <section className="page-layout page-layout--parent">
      <section className="page-intro">
        <p className="eyebrow dark">Parent Setup</p>

        <h1>What&apos;s happening right now?</h1>

        <p>
          Set the moment. The kid side will use this to choose better activities.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Pick the closest moment</h2>
            <p>Choose one, then fine-tune it below.</p>
          </div>
        </div>

        <div className="preset-grid">
          {defaultParentStatusPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyParentStatusPreset(preset)}
            >
              <span>{preset.label}</span>
              <small>{getAvailabilityLabel(preset.availability)}</small>
              <small>
                {preset.timeNeededMinutes} min · {preset.space}
              </small>
            </button>
          ))}
        </div>

        {customParentPresets.length > 0 && (
          <>
            <h3>Custom status</h3>

            <div className="preset-grid">
              {customParentPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyParentStatusPreset(preset)}
                >
                  <span>{preset.label}</span>
                  <small>{getAvailabilityLabel(preset.availability)}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel parent-fine-tune-panel">
        <div className="panel-header compact-panel-header">
          <div>
            <p className="eyebrow dark">Right now</p>
            <h2>{getMomentValue("parentActivity", "Choose a preset")}</h2>
          </div>
        </div>

        <div className="parent-now-chips">
          <span>{Number(currentMoment?.timeNeededMinutes) || 20} min</span>
          <span>{getMomentValue("space", "Space not set")}</span>
          <span>{getMomentValue("noiseLevel", "Noise not set")}</span>
          <span>{getMomentValue("messLevel", "Mess not set")}</span>
          <span>{getMomentValue("supervisionLevel", "Help not set")}</span>
        </div>

        <div className="fine-tune-grid">
          <div className="quick-chip-group">
            <h3>Time</h3>

            <div className="quick-chip-row chip-grid">
              {[10, 20, 30, 45].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={quickChipClass("timeNeededMinutes", minutes)}
                  onClick={() => applyMomentChip({ timeNeededMinutes: minutes })}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>

          <div className="quick-chip-group">
            <h3>Noise</h3>

            <div className="quick-chip-row chip-grid">
              {["quiet", "normal", "loud"].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={quickChipClass("noiseLevel", level)}
                  onClick={() => applyMomentChip({ noiseLevel: level })}
                >
                  {level === "quiet"
                    ? "Quiet"
                    : level === "normal"
                      ? "Normal"
                      : "Loud okay"}
                </button>
              ))}
            </div>
          </div>

          <div className="quick-chip-group">
            <h3>Mess</h3>

            <div className="quick-chip-row chip-grid">
              {["low", "medium", "high"].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={quickChipClass("messLevel", level)}
                  onClick={() => applyMomentChip({ messLevel: level })}
                >
                  {level === "low"
                    ? "Low"
                    : level === "medium"
                      ? "Medium"
                      : "Messy okay"}
                </button>
              ))}
            </div>
          </div>

          <div className="quick-chip-group">
            <h3>Help</h3>

            <div className="quick-chip-row chip-grid">
              <button
                type="button"
                className={quickChipClass("supervisionLevel", "independent")}
                onClick={() =>
                  applyMomentChip({
                    supervisionLevel: "independent",
                    availability: "do-not-interrupt",
                  })
                }
              >
                Independent
              </button>

              <button
                type="button"
                className={quickChipClass("supervisionLevel", "mostly-independent")}
                onClick={() =>
                  applyMomentChip({
                    supervisionLevel: "mostly-independent",
                    availability: "ask-first",
                  })
                }
              >
                Ask first
              </button>

              <button
                type="button"
                className={quickChipClass("supervisionLevel", "nearby")}
                onClick={() =>
                  applyMomentChip({
                    supervisionLevel: "nearby",
                    availability: "helper-welcome",
                  })
                }
              >
                Can help
              </button>
            </div>
          </div>

          <div className="quick-chip-group quick-chip-group--full">
            <h3>Space</h3>

            <div className="quick-chip-row chip-grid">
              {["Living room", "Kitchen table", "Bedroom", "Backyard"].map((space) => (
                <button
                  key={space}
                  type="button"
                  className={quickChipClass("space", space)}
                  onClick={() => applyMomentChip({ space })}
                >
                  {space}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <details className="parent-custom-details">
        <summary>Custom details</summary>

        <section className="panel">
          <div className="controls-grid controls-grid--compact">
            <label>
              What are you doing?
              <input
                value={currentMoment.parentActivity}
                onChange={(event) => updateParentActivity(event.target.value)}
                placeholder="Example: Cooking dinner"
              />
            </label>

            <label>
              Can kids interrupt?
              <select
                value={currentMoment.availability}
                onChange={(event) => updateAvailability(event.target.value)}
              >
                <option value="available">Available</option>
                <option value="ask-first">Ask first</option>
                <option value="do-not-interrupt">Do not interrupt</option>
                <option value="helper-welcome">Helper welcome</option>
              </select>
            </label>
          </div>
        </section>
      </details>

      <div className="page-actions">
        <Link className="primary-link-button" to="/kid">
          Start Kid Mode
        </Link>

        <Link className="ghost-link-button" to="/settings">
          Edit settings
        </Link>
      </div>
    </section>
  );
}

export default ParentPage;
