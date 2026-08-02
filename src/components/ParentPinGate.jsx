import { useState } from "react";
import { verifyParentPin } from "../api/familySettingsApi";
import { useAuth } from "../hooks/useAuth";

function ParentPinGate({ parentPin, parentPinSet, onUnlock, children }) {
  const { user } = useAuth();
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const requiresPin = parentPinSet || Boolean(parentPin);

  if (!requiresPin) {
    return children;
  }

  async function handleUnlock() {
    const cleaned = enteredPin.trim();
    setBusy(true);
    setError("");

    try {
      if (user?.id) {
        await verifyParentPin(cleaned, {
          expectedUserId: user.id,
        });
      } else if (!parentPin || cleaned !== parentPin) {
        setError("That PIN is incorrect.");
        return;
      }

      setEnteredPin("");
      onUnlock();
    } catch (verifyError) {
      /*
       * Fall back to local comparison when the server hash is not set yet
       * (legacy device PIN during migration).
       */
      if (parentPin && cleaned === parentPin) {
        setEnteredPin("");
        onUnlock();
        return;
      }

      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "That PIN is incorrect."
      );
    } finally {
      setBusy(false);
    }
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
                void handleUnlock();
              }
            }}
            placeholder="Enter PIN"
            aria-label="Parent PIN"
          />

          <button type="button" onClick={() => void handleUnlock()} disabled={busy}>
            {busy ? "Checking…" : "Unlock"}
          </button>
        </div>

        {error && <p className="status-message status-message--error">{error}</p>}
      </section>
    </section>
  );
}

export default ParentPinGate;
