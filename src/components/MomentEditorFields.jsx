function MomentEditorFields({ draft, onDraftChange, getAvailabilityLabel }) {
  function quickChipClass(fieldName, expectedValue) {
    const isActive = draft?.[fieldName] === expectedValue;
    return isActive ? "quick-chip active" : "quick-chip";
  }

  function applyChip(adjustment) {
    onDraftChange(adjustment);
  }

  function getMomentValue(fieldName, fallbackText = "Not set") {
    return draft?.[fieldName] || fallbackText;
  }

  return (
    <div className="moment-editor-fields moment-editor-fields--compact">
      <div className="moment-editor-summary">
        <div className="parent-now-chips">
          <span>{Number(draft?.timeNeededMinutes) || 20} min</span>
          <span>{getMomentValue("space", "Space not set")}</span>
          <span>{getMomentValue("noiseLevel", "Noise not set")}</span>
          <span>{getMomentValue("messLevel", "Mess not set")}</span>
          <span>{getMomentValue("supervisionLevel", "Help not set")}</span>
          <span>{getAvailabilityLabel(draft?.availability)}</span>
        </div>
      </div>

      <div className="fine-tune-grid fine-tune-grid--compact">
        <div className="quick-chip-group">
          <h3>Time</h3>

          <div className="quick-chip-row chip-grid">
            {[10, 20, 30, 45].map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={quickChipClass("timeNeededMinutes", minutes)}
                onClick={() => applyChip({ timeNeededMinutes: minutes })}
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
                onClick={() => applyChip({ noiseLevel: level })}
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
                onClick={() => applyChip({ messLevel: level })}
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
                applyChip({
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
                applyChip({
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
                applyChip({
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
                onClick={() => applyChip({ space })}
              >
                {space}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="controls-grid controls-grid--compact moment-editor-advanced">
        <label>
          What are you doing?
          <input
            value={draft.parentActivity}
            onChange={(event) =>
              onDraftChange({ parentActivity: event.target.value })
            }
            placeholder="Example: Cooking dinner"
          />
        </label>

        <label>
          Can kids interrupt?
          <select
            value={draft.availability}
            onChange={(event) =>
              onDraftChange({ availability: event.target.value })
            }
          >
            <option value="available">Available</option>
            <option value="ask-first">Ask first</option>
            <option value="do-not-interrupt">Do not interrupt</option>
            <option value="helper-welcome">Helper welcome</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export default MomentEditorFields;
