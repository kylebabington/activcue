// src/pages/settings/SettingsSecuritySection.jsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { changePassword, signOutCurrentUser } from "../../api/authApi";
import { ApiRequestError } from "../../api/apiClient";
import { BRAND } from "../../config/brand.js";

export default function SettingsSecuritySection({ user, isAnonymous }) {
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordChangeBusy, setPasswordChangeBusy] = useState(false);
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [passwordChangeMessageType, setPasswordChangeMessageType] =
    useState("info");

  async function handleLogOut() {
    setLogoutError("");
    setLogoutBusy(true);
    try {
      await signOutCurrentUser();
      window.location.assign("/login");
    } catch (error) {
      console.error("Could not log out:", error);
      setLogoutError(
        error instanceof Error ? error.message : "Could not log out. Try again."
      );
      setLogoutBusy(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setPasswordChangeMessage("");
    setPasswordChangeMessageType("info");
    if (!user?.email) {
      setPasswordChangeMessage(
        "A permanent account email is required to change the password."
      );
      setPasswordChangeMessageType("error");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordChangeMessage(
        "Use a password that is at least 8 characters long."
      );
      setPasswordChangeMessageType("error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeMessage("The two new passwords do not match.");
      setPasswordChangeMessageType("error");
      return;
    }
    setPasswordChangeBusy(true);
    try {
      await changePassword({
        email: user.email,
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordChangeMessage("Your password has been updated.");
      setPasswordChangeMessageType("success");
      setShowPasswordForm(false);
    } catch (error) {
      console.error("Could not change password:", error);
      const message =
        error instanceof ApiRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not change password. Try again.";
      setPasswordChangeMessage(message);
      setPasswordChangeMessageType("error");
    } finally {
      setPasswordChangeBusy(false);
    }
  }

  return (
    <>
      <section className="panel account-session-panel">
        <div className="panel-header">
          <div>
            <h2>Account</h2>
            <p>
              {isAnonymous
                ? "This browser is using a temporary trial session."
                : `Signed in with a permanent ${BRAND.name} account.`}
            </p>
          </div>
        </div>

        {isAnonymous ? (
          <div className="account-session-actions">
            <Link className="secondary-action" to="/login">
              Log in
            </Link>
            <Link className="billing-account-link" to="/signup">
              Create free account
            </Link>
          </div>
        ) : (
          <div className="account-session-summary">
            {user?.email ? (
              <p className="account-session-email">{user.email}</p>
            ) : null}

            {logoutError ? (
              <p className="billing-notice billing-notice--error" role="alert">
                {logoutError}
              </p>
            ) : null}

            <button
              type="button"
              className="secondary-action"
              onClick={handleLogOut}
              disabled={logoutBusy}
            >
              {logoutBusy ? "Logging out…" : "Log out"}
            </button>
          </div>
        )}
      </section>

      {!isAnonymous ? (
        <section className="panel account-password-panel">
          <div className="panel-header">
            <div>
              <h2>Password</h2>
              <p>Update the password for your {BRAND.name} account.</p>
            </div>
          </div>

          {!showPasswordForm ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => setShowPasswordForm(true)}
            >
              Change password
            </button>
          ) : (
            <form
              className="account-password-form"
              onSubmit={handleChangePassword}
            >
              <label className="account-password-field">
                <span>Current password</span>
                <input
                  type="password"
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>

              <label className="account-password-field">
                <span>New password</span>
                <input
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>

              <label className="account-password-field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  name="confirmNewPassword"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(event) =>
                    setConfirmNewPassword(event.target.value)
                  }
                />
              </label>

              {passwordChangeMessage ? (
                <p
                  className={`billing-notice billing-notice--${passwordChangeMessageType}`}
                  role={
                    passwordChangeMessageType === "error" ? "alert" : "status"
                  }
                >
                  {passwordChangeMessage}
                </p>
              ) : null}

              <div className="child-profile-form-actions">
                <button
                  type="submit"
                  className="secondary-action"
                  disabled={passwordChangeBusy}
                >
                  {passwordChangeBusy
                    ? "Updating password…"
                    : "Update password"}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordChangeMessage("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {passwordChangeMessage && !showPasswordForm ? (
            <p
              className={`billing-notice billing-notice--${passwordChangeMessageType}`}
              role="status"
            >
              {passwordChangeMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
