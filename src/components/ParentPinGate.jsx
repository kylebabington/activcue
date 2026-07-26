import { useState } from "react";

function ParentPinGate({ parentPin, onUnlock, children }) {
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState("");

  if (!parentPin) {
    return children;
  }

  function handleUnlock() {
    if (enteredPin.trim() !== parentPin) {
      setError("That PIN is incorrect.");
      return;
    }

    setError("");
    setEnteredPin("");
    onUnlock();
  }

  return (
    <section className="page-layout page-layout--parent">
      <section className="panel pin-gate-panel">
        <div className="panel-header">
          <div>
            <h2>Parent unlock</h2>
            <p>Enter the parent PIN to open Parent Setup or Settings.</p>
          </div>
        </div>

        <div className="pin-row">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={enteredPin}
            onChange={(event) => {
              setEnteredPin(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleUnlock();
              }
            }}
            placeholder="Enter PIN"
            aria-label="Parent PIN"
          />

          <button type="button" onClick={handleUnlock}>
            Unlock
          </button>
        </div>

        {error && <p className="status-message status-message--error">{error}</p>}
      </section>
    </section>
  );
}

export default ParentPinGate;
