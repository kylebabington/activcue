// src/pages/settings/SettingsDangerSection.jsx

import { useState } from "react";
import { deleteAccount } from "../../api/authApi";
import { ApiRequestError } from "../../api/apiClient";

export default function SettingsDangerSection({
  isAnonymous,
  resetSavedData,
}) {
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

  async function handleDeleteAccount() {
    setDeleteAccountError("");
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteAccountError("Type DELETE to confirm account deletion.");
      return;
    }
    setDeleteAccountBusy(true);
    try {
      await deleteAccount();
      window.location.assign("/");
    } catch (error) {
      console.error("Could not delete account:", error);
      setDeleteAccountError(
        error instanceof ApiRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not delete account. Try again."
      );
      setDeleteAccountBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Danger zone</h2>

      <p>
        Reset all synced family settings and this browser&apos;s local activity
        data. This cannot be undone.
      </p>

      <button className="ghost-button" onClick={resetSavedData}>
        Reset all family data
      </button>

      {!isAnonymous ? (
        <div className="account-delete-block">
          <h3>Delete account</h3>
          <p>
            Permanently delete your ActivCue account, synced family data, and
            sign-in credentials. Cancel an active Stripe subscription separately
            if needed.
          </p>
          <label className="account-password-field">
            <span>Type DELETE to confirm</span>
            <input
              type="text"
              name="deleteConfirm"
              autoComplete="off"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
            />
          </label>
          {deleteAccountError ? (
            <p className="billing-notice billing-notice--error" role="alert">
              {deleteAccountError}
            </p>
          ) : null}
          <button
            type="button"
            className="ghost-button"
            onClick={handleDeleteAccount}
            disabled={deleteAccountBusy}
          >
            {deleteAccountBusy ? "Deleting account…" : "Delete account"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
