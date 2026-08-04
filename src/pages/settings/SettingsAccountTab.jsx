// src/pages/settings/SettingsAccountTab.jsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { changePassword, deleteAccount, signOutCurrentUser } from "../../api/authApi";
import { ApiRequestError } from "../../api/apiClient";
import { calculateAge, resolveChildAge } from "../../utils/childAge";

const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || "support@familyflow.app";

function formatSubscriptionStatus(status) {
  if (typeof status !== "string" || !status) {
    return "Inactive";
  }
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatBillingDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}

export default function SettingsAccountTab({
  user,
  isAnonymous,
  childProfiles,
  activeChildId,
  setActiveChildId,
  newChildName,
  setNewChildName,
  newChildAgeRange,
  setNewChildAgeRange,
  newChildBirthDate,
  setNewChildBirthDate,
  newChildAgeYears,
  setNewChildAgeYears,
  agePreviewYears,
  newChildInterests,
  setNewChildInterests,
  newChildNeeds,
  setNewChildNeeds,
  editingChildId,
  startEditingChildProfile,
  cancelEditingChildProfile,
  addChildProfile,
  deleteChildProfile,
  entitlement,
  entitlementHydrated,
  billing,
  parentPin,
  ParentPinForm,
  saveParentPin,
  resetSavedData,
}) {
  const {
    billingPlanLoading,
    billingMessage,
    billingMessageType,
    subscriptionUpdateAction,
    showCancelConfirmation,
    setShowCancelConfirmation,
    setBillingMessage,
    handleStartCheckout,
    handleRefreshSubscription,
    handleConfirmCancellation,
    handleResumeSubscription,
  } = billing;

  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordChangeBusy, setPasswordChangeBusy] = useState(false);
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [passwordChangeMessageType, setPasswordChangeMessageType] = useState("info");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

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
      setPasswordChangeMessage("A permanent account email is required to change the password.");
      setPasswordChangeMessageType("error");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordChangeMessage("Use a password that is at least 8 characters long.");
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
      await changePassword({ email: user.email, currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordChangeMessage("Your password has been updated.");
      setPasswordChangeMessageType("success");
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

  async function handleDeleteAccount() {
    setDeleteAccountError("");
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteAccountError('Type DELETE to confirm account deletion.');
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
    <div
      className="settings-tab-panel"
      role="tabpanel"
      id="settings-panel-account"
      aria-labelledby="settings-tab-account"
    >
            <section className="panel child-profile-panel">
              <div className="panel-header">
                <div>
                  <h2>Child Profiles</h2>
                  <p>
                    Add basic details so AI suggestions can fit each child instead of
                    treating everyone the same.
                  </p>
                </div>
              </div>

              <div
                className={
                  editingChildId
                    ? "child-profile-form child-profile-form--editing"
                    : "child-profile-form"
                }
                id="child-profile-form"
              >
                {editingChildId ? (
                  <p className="child-age-prompt" role="status">
                    Editing profile — update the fields below, then save.
                  </p>
                ) : null}

                <label>
                  Child name
                  <input
                    id="child-profile-name-input"
                    value={newChildName}
                    onChange={(event) => setNewChildName(event.target.value)}
                    placeholder="Example: Mia"
                  />
                </label>

                <label>
                  Birthday
                  <input
                    type="date"
                    value={newChildBirthDate}
                    onChange={(event) => {
                      const next = event.target.value;
                      setNewChildBirthDate(next);
                      if (next) {
                        const age = calculateAge(next);
                        if (Number.isFinite(age)) {
                          setNewChildAgeYears(String(age));
                          setNewChildAgeRange(
                            age <= 5
                              ? "3-5"
                              : age <= 9
                                ? "6-9"
                                : age <= 12
                                  ? "10-12"
                                  : "13+"
                          );
                        }
                      }
                    }}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </label>

                <label>
                  Or exact current age
                  <input
                    type="number"
                    min={0}
                    max={25}
                    inputMode="numeric"
                    value={newChildAgeYears}
                    onChange={(event) => {
                      const next = event.target.value;
                      setNewChildAgeYears(next);
                      // Keep birthday unless the typed age no longer matches it.
                      if (next !== "" && newChildBirthDate) {
                        const fromBirthday = calculateAge(newChildBirthDate);
                        const typed = Math.floor(Number(next));
                        if (
                          Number.isFinite(fromBirthday) &&
                          Number.isFinite(typed) &&
                          fromBirthday !== typed
                        ) {
                          setNewChildBirthDate("");
                        }
                      }
                      const typed = Math.floor(Number(next));
                      if (Number.isFinite(typed) && typed >= 0 && typed <= 25) {
                        setNewChildAgeRange(
                          typed <= 5
                            ? "3-5"
                            : typed <= 9
                              ? "6-9"
                              : typed <= 12
                                ? "10-12"
                                : "13+"
                        );
                      }
                    }}
                    placeholder="Example: 14"
                  />
                </label>

                <label>
                  Age range fallback
                  <select
                    value={newChildAgeRange}
                    onChange={(event) =>
                      setNewChildAgeRange(event.target.value)
                    }
                  >
                    <option value="3-5">3-5</option>
                    <option value="6-9">6-9</option>
                    <option value="10-12">10-12</option>
                    <option value="13+">13+</option>
                  </select>
                </label>

                {agePreviewYears != null ? (
                  <p className="child-age-preview" role="status">
                    Current age used for suggestions: {agePreviewYears}
                  </p>
                ) : (
                  <p className="child-age-prompt" role="status">
                    Add a birthday or exact age when you can. Age range is only
                    a temporary fallback.
                  </p>
                )}

                {editingChildId &&
                !newChildBirthDate &&
                !newChildAgeYears ? (
                  <p className="child-age-prompt" role="status">
                    This profile still uses an age range only. Add a birthday or
                    exact age so suggestions stay age-appropriate.
                  </p>
                ) : null}

                <label>
                  Interests
                  <input
                    value={newChildInterests}
                    onChange={(event) => setNewChildInterests(event.target.value)}
                    placeholder="Example: animals, LEGO, drawing"
                  />
                </label>

                <label>
                  Helpful notes
                  <input
                    value={newChildNeeds}
                    onChange={(event) => setNewChildNeeds(event.target.value)}
                    placeholder="Example: gets overwhelmed by loud games"
                  />
                </label>

                <div className="child-profile-form-actions">
                  <button type="button" onClick={addChildProfile}>
                    {editingChildId ? "Save profile" : "Add child profile"}
                  </button>

                  {editingChildId && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={cancelEditingChildProfile}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </div>

              {childProfiles.length === 0 ? (
                <p className="empty-text">No child profiles yet.</p>
              ) : (
                <div className="child-profile-list">
                  {childProfiles.map((child) => (
                    <article
                      key={child.id}
                      className={
                        activeChildId === child.id
                          ? "child-profile-card active"
                          : "child-profile-card"
                      }
                    >
                      <div>
                        <h3>{child.name}</h3>
                        {(() => {
                          const resolved = resolveChildAge(child);
                          return (
                            <p>
                              Age: {resolved.ageYears}
                              {child.birthDate
                                ? ` (birthday ${child.birthDate})`
                                : ` (${child.ageRange || "range"})`}
                            </p>
                          );
                        })()}

                        {child.interests && <p>Interests: {child.interests}</p>}
                        {child.needs && <p>Notes: {child.needs}</p>}
                        {!child.birthDate ? (
                          <p className="child-age-prompt">
                            Birthday not set — edit to add one.
                          </p>
                        ) : null}
                      </div>

                      <div className="child-profile-actions">
                        <button
                          type="button"
                          onClick={() => setActiveChildId(child.id)}
                        >
                          Use profile
                        </button>

                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => startEditingChildProfile(child)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => deleteChildProfile(child.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="panel account-session-panel">
              <div className="panel-header">
                <div>
                  <h2>Signed in</h2>
                  <p>
                    {isAnonymous
                      ? "This browser is using a temporary trial session."
                      : "You are signed in with a permanent FamilyFlow account."}
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
                    <h2>Change password</h2>
                    <p>
                      Update the password for{" "}
                      {user?.email || "your FamilyFlow account"}.
                    </p>
                  </div>
                </div>

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
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
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
                      onChange={(event) =>
                        setNewPassword(event.target.value)
                      }
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
                      className={
                        `billing-notice ` +
                        `billing-notice--${passwordChangeMessageType}`
                      }
                      role={
                        passwordChangeMessageType === "error"
                          ? "alert"
                          : "status"
                      }
                    >
                      {passwordChangeMessage}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    className="secondary-action"
                    disabled={passwordChangeBusy}
                  >
                    {passwordChangeBusy
                      ? "Updating password…"
                      : "Update password"}
                  </button>
                </form>
              </section>
            ) : null}

            <section className="panel billing-panel">
              <div className="panel-header">
                <div>
                  <h2>FamilyFlow Plus</h2>

                  <p>
                    Unlock AI-generated activities,
                    personalized ideas, and AI activity
                    hints. Favorites and history stay
                    free on this device (and sync when
                    you are signed in).
                  </p>
                </div>
              </div>

              {billingMessage ? (
                <div
                  className={
                    `billing-notice ` +
                    `billing-notice--${billingMessageType}`
                  }
                  role={
                    billingMessageType === "error"
                      ? "alert"
                      : "status"
                  }
                  aria-live="polite"
                >
                  {billingMessage}
                </div>
              ) : null}

              {!entitlementHydrated ? (
                <p className="billing-loading">
                  Checking your subscription…
                </p>
              ) : entitlement.billingExempt ? (
                <div className="billing-active-summary">
                  <div className="billing-active-details">
                    <strong>
                      FamilyFlow Plus is included
                    </strong>

                    <p>
                      {entitlement.isAdmin
                        ? "Administrator account"
                        : "Complimentary access"}
                    </p>

                    <p>
                      This account has full Plus
                      access and is not billed
                      through Stripe.
                    </p>
                  </div>
                </div>
              ) : entitlement.isPaid ? (
                <div className="billing-active-summary">
                  <div className="billing-active-details">
                    <strong>
                      FamilyFlow Plus is active
                    </strong>

                    <p>
                      Status:{" "}
                      {formatSubscriptionStatus(
                        entitlement
                          .subscriptionStatus
                      )}
                    </p>

                    {entitlement.currentPeriodEnd ? (
                      <p>
                        Current billing period ends{" "}
                        {formatBillingDate(
                          entitlement
                            .currentPeriodEnd
                        )}
                        .
                      </p>
                    ) : null}

                    {entitlement
                      .cancelAtPeriodEnd ? (
                      <p className="billing-renewal-status billing-renewal-status--ending">
                        Automatic renewal is
                        canceled. Your Plus access
                        remains active through the
                        current billing period.
                      </p>
                    ) : (
                      <p className="billing-renewal-status">
                        Your subscription will renew
                        automatically.
                      </p>
                    )}
                  </div>

                  <div className="billing-management-controls">
                    {entitlement
                      .cancelAtPeriodEnd ? (
                      <button
                        type="button"
                        className="billing-resume-button"
                        onClick={
                          handleResumeSubscription
                        }
                        disabled={
                          Boolean(
                            subscriptionUpdateAction
                          )
                        }
                      >
                        {subscriptionUpdateAction ===
                          "resume"
                          ? "Restoring renewal…"
                          : "Keep FamilyFlow Plus"}
                      </button>
                    ) : !showCancelConfirmation ? (
                      <button
                        type="button"
                        className="billing-cancel-button"
                        onClick={() => {
                          setShowCancelConfirmation(
                            true
                          );

                          setBillingMessage("");
                        }}
                        disabled={
                          Boolean(
                            subscriptionUpdateAction
                          )
                        }
                      >
                        Cancel renewal
                      </button>
                    ) : (
                      <div className="billing-cancel-confirmation">
                        <strong>
                          Cancel FamilyFlow Plus
                          renewal?
                        </strong>

                        {entitlement
                          .currentPeriodEnd ? (
                          <p>
                            You will keep Plus access
                            through{" "}
                            {formatBillingDate(
                              entitlement
                                .currentPeriodEnd
                            )}
                            . Your subscription will
                            not renew after that date.
                          </p>
                        ) : (
                          <p>
                            You will keep Plus access
                            through the current paid
                            billing period. Your
                            subscription will not
                            renew afterward.
                          </p>
                        )}

                        <div className="billing-management-actions">
                          <button
                            type="button"
                            className="secondary-action"
                            onClick={() => {
                              setShowCancelConfirmation(
                                false
                              );
                            }}
                            disabled={
                              Boolean(
                                subscriptionUpdateAction
                              )
                            }
                          >
                            Keep subscription
                          </button>

                          <button
                            type="button"
                            className="billing-confirm-cancel-button"
                            onClick={
                              handleConfirmCancellation
                            }
                            disabled={
                              Boolean(
                                subscriptionUpdateAction
                              )
                            }
                          >
                            {subscriptionUpdateAction ===
                              "cancel"
                              ? "Canceling renewal…"
                              : "Confirm cancellation"}
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="secondary-action"
                      onClick={
                        handleRefreshSubscription
                      }
                      disabled={
                        Boolean(
                          subscriptionUpdateAction
                        )
                      }
                    >
                      Refresh subscription status
                    </button>
                  </div>
                </div>

              ) : isAnonymous ? (
                <div className="billing-account-required">
                  <p>
                    Your current session is an
                    anonymous trial. Create a free
                    permanent account before adding a
                    paid subscription.
                  </p>

                  <Link
                    className="billing-account-link"
                    to="/signup"
                  >
                    Create free account
                  </Link>
                </div>
              ) : (
                <>
                  <div className="billing-plan-grid">
                    <article className="billing-plan-card">
                      <p className="billing-plan-name">
                        Monthly
                      </p>

                      <p className="billing-plan-price">
                        <strong>$4.99</strong>
                        <span>per month</span>
                      </p>

                      <p>
                        Full FamilyFlow Plus access
                        with monthly billing.
                      </p>

                      <button
                        type="button"
                        className="billing-plan-action"
                        disabled={
                          Boolean(
                            billingPlanLoading
                          )
                        }
                        onClick={() =>
                          handleStartCheckout(
                            "monthly"
                          )
                        }
                      >
                        {billingPlanLoading ===
                          "monthly"
                          ? "Opening Checkout…"
                          : "Choose monthly"}
                      </button>
                    </article>

                    <article className="billing-plan-card billing-plan-card--featured">
                      <p className="billing-plan-badge">
                        Best value
                      </p>

                      <p className="billing-plan-name">
                        Annual
                      </p>

                      <p className="billing-plan-price">
                        <strong>$39.99</strong>
                        <span>per year</span>
                      </p>

                      <p>
                        A full year of FamilyFlow
                        Plus at a lower yearly price.
                      </p>

                      <button
                        type="button"
                        className="billing-plan-action"
                        disabled={
                          Boolean(
                            billingPlanLoading
                          )
                        }
                        onClick={() =>
                          handleStartCheckout(
                            "annual"
                          )
                        }
                      >
                        {billingPlanLoading ===
                          "annual"
                          ? "Opening Checkout…"
                          : "Choose annual"}
                      </button>
                    </article>
                  </div>

                  <button
                    type="button"
                    className="billing-refresh-button"
                    onClick={
                      handleRefreshSubscription
                    }
                  >
                    Refresh subscription status
                  </button>
                </>
              )}
            </section>

                <section className="panel pin-settings-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Parent PIN</h2>
                      <p>
                        When set, Parent and Settings stay locked until unlocked for this
                        session. MVP-level protection, not real account security.
                      </p>
                    </div>
                  </div>

                  <ParentPinForm parentPin={parentPin} saveParentPin={saveParentPin} />
                </section>

                <section className="panel">
                  <h2>Danger zone</h2>

                  <p>
                    Reset synced family settings and this browser&apos;s local activity
                    data. This cannot be undone.
                  </p>

                  <button className="ghost-button" onClick={resetSavedData}>
                    Reset saved data
                  </button>

                  {!isAnonymous ? (
                    <div className="account-delete-block">
                      <h3>Delete account</h3>
                      <p>
                        Permanently delete your FamilyFlow account, synced family
                        data, and sign-in credentials. Active Stripe subscriptions
                        should be cancelled separately if needed.
                      </p>
                      <label className="account-password-field">
                        <span>Type DELETE to confirm</span>
                        <input
                          type="text"
                          name="deleteConfirm"
                          autoComplete="off"
                          value={deleteConfirmText}
                          onChange={(event) =>
                            setDeleteConfirmText(event.target.value)
                          }
                        />
                      </label>
                      {deleteAccountError ? (
                        <p
                          className="billing-notice billing-notice--error"
                          role="alert"
                        >
                          {deleteAccountError}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountBusy}
                      >
                        {deleteAccountBusy
                          ? "Deleting account…"
                          : "Delete account"}
                      </button>
                    </div>
                  ) : null}
                </section>

                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Support</h2>
                      <p>
                        Questions, billing help, or privacy requests — email us
                        and we will get back to you.
                      </p>
                    </div>
                  </div>
                  <p>
                    <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                  </p>
                  <p className="account-legal-links">
                    <Link to="/privacy">Privacy Policy</Link>
                    {" · "}
                    <Link to="/terms">Terms of Use</Link>
                  </p>
                </section>


    </div>
  );
}
