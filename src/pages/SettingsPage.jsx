// src/pages/SettingsPage.jsx

import {
  useCallback,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";
import SavedActivitiesPanel from "../components/SavedActivitiesPanel";
import ActivityHistoryPanel from "../components/ActivityHistoryPanel";
import ThemeSwitcher from "../components/ThemeSwitcher";
import {
  cancelSubscription,
  createCheckoutSession,
  resumeSubscription,
} from "../api/billingApi";
import { useCheckoutReturn } from "../features/billing/useCheckoutReturn";
import {
  changePassword,
  signOutCurrentUser,
} from "../api/authApi";
import { ApiRequestError } from "../api/apiClient";

import { useAppContext } from "../context/AppContext";
import { useAuth } from "../hooks/useAuth";

function formatSubscriptionStatus(
  status
) {
  if (
    typeof status !== "string" ||
    !status
  ) {
    return "Inactive";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatBillingDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "long",
    }
  ).format(date);
}

function SettingsPage() {
  const {
    safetySettings,
    toggleSafetySetting,
    updateSafetySetting,
    inventoryCategories,
    inventoryPresets,
    customInventoryItems,
    isInventoryItemSelected,
    toggleInventoryPreset,
    newInventoryItem,
    setNewInventoryItem,
    newInventoryCategory,
    setNewInventoryCategory,
    addInventoryItem,
    removeInventoryItem,
    childProfiles,
    activeChildId,
    setActiveChildId,
    activityMode,
    setActivityMode,
    newChildName,
    setNewChildName,
    newChildAgeRange,
    setNewChildAgeRange,
    newChildInterests,
    setNewChildInterests,
    newChildNeeds,
    setNewChildNeeds,
    editingChildId,
    startEditingChildProfile,
    cancelEditingChildProfile,
    addChildProfile,
    deleteChildProfile,
    parentPin,
    ParentPinForm,
    saveParentPin,
    savedActivities,
    handleReplaySavedActivity,
    removeSavedActivity,
    activityHistory,
    clearActivityHistory,
    formatFeedbackLabel,
    resetSavedData,
    uiTheme,
    setUiTheme,
    uiThemes,
    entitlement,
    entitlementHydrated,
    refreshEntitlement,
  } = useAppContext();

  const {
    user,
    isAnonymous,
  } = useAuth();

  const [
    billingPlanLoading,
    setBillingPlanLoading,
  ] = useState("");

  const [
    billingMessage,
    setBillingMessage,
  ] = useState("");

  const [
    billingMessageType,
    setBillingMessageType,
  ] = useState("info");

  /*
 * Tracks a cancel or resume request separately from Checkout.
 *
 * Values:
 *
 *   ""       -> no request running
 *   "cancel" -> scheduling cancellation
 *   "resume" -> restoring renewal
 */
  const [
    subscriptionUpdateAction,
    setSubscriptionUpdateAction,
  ] = useState("");

  /*
   * Show an in-app confirmation before scheduling cancellation.
   */
  const [
    showCancelConfirmation,
    setShowCancelConfirmation,
  ] = useState(false);

  const [
    logoutBusy,
    setLogoutBusy,
  ] = useState(false);

  const [
    logoutError,
    setLogoutError,
  ] = useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmNewPassword,
    setConfirmNewPassword,
  ] = useState("");

  const [
    passwordChangeBusy,
    setPasswordChangeBusy,
  ] = useState(false);

  const [
    passwordChangeMessage,
    setPasswordChangeMessage,
  ] = useState("");

  const [
    passwordChangeMessageType,
    setPasswordChangeMessageType,
  ] = useState("info");

  const [inventorySearch, setInventorySearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const handleCheckoutStatus = useCallback((message, type) => {
    setBillingMessage(message);
    setBillingMessageType(type);
  }, []);

  /*
   * Stripe redirects back to Settings after Checkout (?billing=...).
   * useCheckoutReturn owns polling and clears the URL only after a final status.
   */
  useCheckoutReturn({
    refreshEntitlement,
    onStatus: handleCheckoutStatus,
  });

  async function handleLogOut() {
    setLogoutError("");
    setLogoutBusy(true);

    try {
      await signOutCurrentUser();

      /*
       * Full navigation leaves AuthProvider, which requires a session for
       * /app routes. /login is public and does not recreate an anonymous user.
       */
      window.location.assign("/login");
    } catch (error) {
      console.error("Could not log out:", error);

      setLogoutError(
        error instanceof Error
          ? error.message
          : "Could not log out. Try again."
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
      setPasswordChangeMessage(
        "The two new passwords do not match."
      );
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
      setPasswordChangeMessage(
        "Your password has been updated."
      );
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

  async function handleStartCheckout(
    plan
  ) {
    if (
      isAnonymous ||
      !user?.id
    ) {
      setBillingMessage(
        "Create a permanent account before subscribing."
      );

      setBillingMessageType("error");

      return;
    }

    setBillingPlanLoading(plan);
    setBillingMessage("");
    setBillingMessageType("info");

    try {
      const checkout =
        await createCheckoutSession(
          plan,
          {
            expectedUserId:
              user.id,
          }
        );

      /*
       * Navigate away from FamilyFlow to Stripe's hosted payment page.
       */
      window.location.assign(
        checkout.url
      );
    } catch (error) {
      console.error(
        "Could not start Stripe Checkout:",
        error
      );

      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Could not start checkout. Try again."
      );

      setBillingMessageType("error");
      setBillingPlanLoading("");
    }
  }

  async function handleRefreshSubscription() {
    setBillingMessage(
      "Refreshing subscription status…"
    );

    setBillingMessageType("info");

    try {
      const nextEntitlement =
        await refreshEntitlement();

      if (nextEntitlement.isPaid) {
        setBillingMessage(
          "FamilyFlow Plus is active."
        );

        setBillingMessageType(
          "success"
        );
      } else {
        setBillingMessage(
          "FamilyFlow Plus is not active yet. Stripe may still be processing the subscription."
        );

        setBillingMessageType("info");
      }
    } catch (error) {
      console.error(
        "Could not refresh subscription status:",
        error
      );

      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Could not refresh subscription status."
      );

      setBillingMessageType("error");
    }
  }

  /*
   * Schedule the subscription to stop renewing after the current paid period.
   *
   * FamilyFlow Plus remains active until currentPeriodEnd.
   */
  async function handleConfirmCancellation() {
    if (
      isAnonymous ||
      !user?.id
    ) {
      setBillingMessage(
        "A permanent account is required to manage a subscription."
      );

      setBillingMessageType("error");

      return;
    }

    setSubscriptionUpdateAction(
      "cancel"
    );

    setBillingMessage("");
    setBillingMessageType("info");

    try {
      const result =
        await cancelSubscription({
          expectedUserId:
            user.id,
        });

      /*
       * Refresh the server-trusted entitlement after Stripe is updated.
       */
      try {
        await refreshEntitlement();
      } catch (refreshError) {
        console.warn(
          "Cancellation succeeded, but the entitlement refresh failed:",
          refreshError
        );
      }

      setShowCancelConfirmation(
        false
      );

      setBillingMessage(
        result.message ||
        "FamilyFlow Plus will remain active through the current billing period and will not renew."
      );

      setBillingMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "Could not cancel subscription renewal:",
        error
      );

      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Could not cancel subscription renewal. Try again."
      );

      setBillingMessageType(
        "error"
      );
    } finally {
      setSubscriptionUpdateAction(
        ""
      );
    }
  }

  /*
   * Remove a scheduled cancellation before the subscription fully ends.
   */
  async function handleResumeSubscription() {
    if (
      isAnonymous ||
      !user?.id
    ) {
      setBillingMessage(
        "A permanent account is required to manage a subscription."
      );

      setBillingMessageType("error");

      return;
    }

    setSubscriptionUpdateAction(
      "resume"
    );

    setBillingMessage("");
    setBillingMessageType("info");

    try {
      const result =
        await resumeSubscription({
          expectedUserId:
            user.id,
        });

      try {
        await refreshEntitlement();
      } catch (refreshError) {
        console.warn(
          "Renewal resumed, but the entitlement refresh failed:",
          refreshError
        );
      }

      setShowCancelConfirmation(
        false
      );

      setBillingMessage(
        result.message ||
        "Automatic renewal has been restored for FamilyFlow Plus."
      );

      setBillingMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "Could not resume subscription renewal:",
        error
      );

      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Could not resume subscription renewal. Try again."
      );

      setBillingMessageType(
        "error"
      );
    } finally {
      setSubscriptionUpdateAction(
        ""
      );
    }
  }

  const normalizedSearch = inventorySearch.trim().toLowerCase();

  function presetMatchesFilters(preset) {
    const isSelected = isInventoryItemSelected(preset.name);

    if (showSelectedOnly && !isSelected) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return preset.name.toLowerCase().includes(normalizedSearch);
  }

  return (
    <section className="page-layout page-layout--parent">
      <section className="settings-cluster">
        <h2 className="settings-cluster-title">Family setup</h2>

        <div className="content-grid-2">
          <section className="panel safety-panel">
            <div className="panel-header">
              <div>
                <h2>Safety Settings</h2>
                <p>These rules tell the AI what not to suggest.</p>
                <p className="settings-note">
                  Current moment can tighten time and quiet while it is active.
                </p>
              </div>
            </div>

            <div className="safety-toggle-grid">
              <button
                type="button"
                className={safetySettings.screenFreeOnly ? "enabled" : ""}
                onClick={() => toggleSafetySetting("screenFreeOnly")}
              >
                <span>Screen-free only</span>
                <small>
                  {safetySettings.screenFreeOnly
                    ? "AI avoids screens"
                    : "Screens may be suggested"}
                </small>
              </button>

              <button
                type="button"
                className={safetySettings.noFoodActivities ? "enabled" : ""}
                onClick={() => toggleSafetySetting("noFoodActivities")}
              >
                <span>No food activities</span>
                <small>
                  {safetySettings.noFoodActivities
                    ? "AI avoids food"
                    : "Food may be suggested"}
                </small>
              </button>

              <button
                type="button"
                className={safetySettings.noWaterPlay ? "enabled" : ""}
                onClick={() => toggleSafetySetting("noWaterPlay")}
              >
                <span>No water play</span>
                <small>
                  {safetySettings.noWaterPlay
                    ? "AI avoids water play"
                    : "Water play may be suggested"}
                </small>
              </button>

              <button
                type="button"
                className={safetySettings.noSmallObjects ? "enabled" : ""}
                onClick={() => toggleSafetySetting("noSmallObjects")}
              >
                <span>No small objects</span>
                <small>
                  {safetySettings.noSmallObjects
                    ? "AI avoids choking-sized items"
                    : "Small items may be suggested"}
                </small>
              </button>

              <button
                type="button"
                className={safetySettings.quietMode ? "enabled" : ""}
                onClick={() => toggleSafetySetting("quietMode")}
              >
                <span>Quiet mode</span>
                <small>
                  {safetySettings.quietMode
                    ? "AI suggests quiet ideas"
                    : "Normal noise allowed"}
                </small>
              </button>
            </div>

            <div className="safety-controls-grid">
              <label>
                Max activity time
                <select
                  value={safetySettings.maxActivityMinutes}
                  onChange={(event) =>
                    updateSafetySetting(
                      "maxActivityMinutes",
                      Number(event.target.value)
                    )
                  }
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </label>

              <label>
                Adult help allowed?
                <select
                  value={safetySettings.adultHelpAllowed}
                  onChange={(event) =>
                    updateSafetySetting("adultHelpAllowed", event.target.value)
                  }
                >
                  <option value="none">No adult help</option>
                  <option value="optional">Optional adult help</option>
                  <option value="needed">Adult help is okay</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Who is playing?</h2>
                <p>Choose one child or family mode for shared activities.</p>
              </div>
            </div>

            <div className="activity-mode-toggle">
              <button
                type="button"
                className={activityMode === "single-child" ? "enabled" : ""}
                onClick={() => setActivityMode("single-child")}
              >
                <span>One child</span>
                <small>Uses the active child profile</small>
              </button>

              <button
                type="button"
                className={activityMode === "family" ? "enabled" : ""}
                onClick={() => setActivityMode("family")}
              >
                <span>Family / siblings</span>
                <small>Ideas for everyone together</small>
              </button>
            </div>
          </section>
        </div>

        <section className="panel inventory-panel">
          <div className="panel-header">
            <div>
              <h2>Toy & Supply Inventory</h2>
              <p>
                Tap what you have at home. No typing needed — pick from common
                toys, craft supplies, and play items.
              </p>
            </div>
          </div>

          <div className="inventory-filter-row">
            <input
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
              placeholder="Search supplies"
              aria-label="Search supplies"
            />

            <button
              type="button"
              className={showSelectedOnly ? "enabled" : "secondary-action"}
              onClick={() => setShowSelectedOnly((current) => !current)}
            >
              {showSelectedOnly ? "Showing selected" : "Show selected only"}
            </button>
          </div>

          <div className="inventory-preset-list">
            {inventoryCategories.map((category) => {
              const presetsInCategory = inventoryPresets.filter(
                (preset) =>
                  preset.category === category && presetMatchesFilters(preset)
              );

              if (presetsInCategory.length === 0) {
                return null;
              }

              return (
                <section key={category} className="inventory-category-group">
                  <h3>{category}</h3>

                  <div className="chip-list inventory-preset-grid">
                    {presetsInCategory.map((preset) => {
                      const isSelected = isInventoryItemSelected(preset.name);

                      return (
                        <button
                          key={preset.name}
                          type="button"
                          className={
                            isSelected
                              ? "chip inventory-preset-chip selected"
                              : "chip inventory-preset-chip"
                          }
                          aria-pressed={isSelected}
                          onClick={() => toggleInventoryPreset(preset)}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {customInventoryItems.length > 0 && (
            <section className="inventory-category-group inventory-custom-group">
              <h3>Custom items</h3>

              <div className="chip-list">
                {customInventoryItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="chip inventory-preset-chip selected"
                    onClick={() => removeInventoryItem(item.id)}
                  >
                    {item.name} ×
                  </button>
                ))}
              </div>
            </section>
          )}

          <details className="inventory-custom-add">
            <summary>Add something not listed</summary>

            <div className="inventory-add-grid">
              <input
                value={newInventoryItem}
                onChange={(event) => setNewInventoryItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addInventoryItem();
                }}
                placeholder="Example: marble collection, ukulele"
              />

              <select
                value={newInventoryCategory}
                onChange={(event) =>
                  setNewInventoryCategory(event.target.value)
                }
              >
                {inventoryCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button type="button" onClick={addInventoryItem}>
                Add
              </button>
            </div>
          </details>
        </section>

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

          <div className="child-profile-form">
            <label>
              Child name
              <input
                value={newChildName}
                onChange={(event) => setNewChildName(event.target.value)}
                placeholder="Example: Mia"
              />
            </label>

            <label>
              Age range
              <select
                value={newChildAgeRange}
                onChange={(event) => setNewChildAgeRange(event.target.value)}
              >
                <option value="3-5">3-5</option>
                <option value="6-9">6-9</option>
                <option value="10-12">10-12</option>
                <option value="13+">13+</option>
              </select>
            </label>

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
                    <p>Age: {child.ageRange}</p>

                    {child.interests && <p>Interests: {child.interests}</p>}
                    {child.needs && <p>Notes: {child.needs}</p>}
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
      </section>

      <section className="settings-cluster">
        <h2 className="settings-cluster-title">Saved & history</h2>

        <SavedActivitiesPanel
          savedActivities={savedActivities}
          handleReplaySavedActivity={handleReplaySavedActivity}
          removeSavedActivity={removeSavedActivity}
        />

        <ActivityHistoryPanel
          activityHistory={activityHistory}
          clearActivityHistory={clearActivityHistory}
          formatFeedbackLabel={formatFeedbackLabel}
        />
      </section>

      <section className="settings-cluster">
        <h2 className="settings-cluster-title">Account</h2>

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
                personalized ideas, and AI quest
                hints.
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

        <section className="panel theme-settings-panel">
          <div className="panel-header">
            <div>
              <h2>Look & feel</h2>
              <p>
                Switch themes anytime. Compare Playroom, Workshop, and Storybook
                to find what fits your family.
              </p>
            </div>
          </div>

          <ThemeSwitcher
            theme={uiTheme}
            onChange={setUiTheme}
            themes={uiThemes}
          />
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
            Reset synced family settings and this browser&apos;s local quest
            data. This cannot be undone.
          </p>

          <button className="ghost-button" onClick={resetSavedData}>
            Reset saved data
          </button>
        </section>
      </section>
    </section>
  );
}

export default SettingsPage;
