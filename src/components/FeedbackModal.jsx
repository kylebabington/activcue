// src/components/FeedbackModal.jsx

import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  FEEDBACK_CATEGORIES,
  submitUserFeedback,
} from "../api/feedbackApi";
import { trackProductEvent } from "../utils/analytics";
import Modal from "./Modal";

export default function FeedbackModal({ isOpen, onClose }) {
  const location = useLocation();
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const submitLockRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitLockRef.current) {
      return;
    }
    submitLockRef.current = true;
    setBusy(true);
    setError("");
    try {
      await submitUserFeedback({
        category,
        message,
        page: location.pathname || "/",
      });
      trackProductEvent("feedback_submitted", {
        category,
        page: location.pathname || "/",
      });
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setBusy(false);
      submitLockRef.current = false;
    }
  }

  function handleClose() {
    setError("");
    setSent(false);
    onClose();
  }

  return (
    <Modal title="Send feedback" isOpen={isOpen} onClose={handleClose}>
      {sent ? (
        <div className="feedback-modal-success">
          <p>Thanks — we got your note.</p>
          <button type="button" className="primary-button" onClick={handleClose}>
            Done
          </button>
        </div>
      ) : (
        <form className="feedback-modal-form" onSubmit={handleSubmit}>
          <label className="feedback-field">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={busy}
            >
              {FEEDBACK_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="feedback-field">
            <span>Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="What should we know?"
              disabled={busy}
              required
            />
          </label>

          {error ? (
            <p className="status-message status-message--error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="feedback-modal-actions">
            <button type="button" onClick={handleClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
