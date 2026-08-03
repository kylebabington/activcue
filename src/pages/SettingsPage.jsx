// src/pages/SettingsPage.jsx

import { useCallback } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../hooks/useAuth";
import { useBillingActions } from "../features/settings/useBillingActions";
import SettingsPreferencesTab from "./settings/SettingsPreferencesTab";
import SettingsInventoryTab from "./settings/SettingsInventoryTab";
import SettingsHistoryTab from "./settings/SettingsHistoryTab";
import SettingsAccountTab from "./settings/SettingsAccountTab";
import SettingsHouseholdTab from "./settings/SettingsHouseholdTab";

const SETTINGS_TABS = [
  { id: "preferences", label: "Preferences" },
  { id: "inventory", label: "Inventory" },
  { id: "household", label: "Household" },
  { id: "history", label: "History" },
  { id: "account", label: "Account" },
];

function SettingsPage() {
  const ctx = useAppContext();
  const { user, isAnonymous } = useAuth();

  const [settingsTab, setSettingsTab] = useLocalStorage(
    "settingsTab",
    "preferences"
  );

  const activeSettingsTab = SETTINGS_TABS.some((tab) => tab.id === settingsTab)
    ? settingsTab
    : "preferences";

  const openAccountTab = useCallback(() => {
    setSettingsTab("account");
  }, [setSettingsTab]);

  const billing = useBillingActions({
    user,
    isAnonymous,
    refreshEntitlement: ctx.refreshEntitlement,
    onOpenAccountTab: openAccountTab,
  });

  return (
    <section className="page-layout page-layout--parent">
      <div
        className="settings-tablist"
        role="tablist"
        aria-label="Settings sections"
      >
        {SETTINGS_TABS.map((tab) => {
          const isActive = activeSettingsTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={
                isActive
                  ? "settings-tab settings-tab--active"
                  : "settings-tab"
              }
              onClick={() => setSettingsTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSettingsTab === "preferences" ? (
        <SettingsPreferencesTab
          safetySettings={ctx.safetySettings}
          toggleSafetySetting={ctx.toggleSafetySetting}
          updateSafetySetting={ctx.updateSafetySetting}
          uiTheme={ctx.uiTheme}
          setUiTheme={ctx.setUiTheme}
          uiThemes={ctx.uiThemes}
          kidDeviceMode={ctx.kidDeviceMode}
          setKidDeviceMode={ctx.setKidDeviceMode}
        />
      ) : null}

      {activeSettingsTab === "inventory" ? (
        <SettingsInventoryTab
          inventoryCategories={ctx.inventoryCategories}
          inventoryPresets={ctx.inventoryPresets}
          customInventoryItems={ctx.customInventoryItems}
          isInventoryItemSelected={ctx.isInventoryItemSelected}
          toggleInventoryPreset={ctx.toggleInventoryPreset}
          newInventoryItem={ctx.newInventoryItem}
          setNewInventoryItem={ctx.setNewInventoryItem}
          newInventoryCategory={ctx.newInventoryCategory}
          setNewInventoryCategory={ctx.setNewInventoryCategory}
          addInventoryItem={ctx.addInventoryItem}
          removeInventoryItem={ctx.removeInventoryItem}
        />
      ) : null}

      {activeSettingsTab === "history" ? (
        <SettingsHistoryTab
          savedActivities={ctx.savedActivities}
          handleReplaySavedActivity={ctx.handleReplaySavedActivity}
          removeSavedActivity={ctx.removeSavedActivity}
          activityHistory={ctx.activityHistory}
          clearActivityHistory={ctx.clearActivityHistory}
          formatFeedbackLabel={ctx.formatFeedbackLabel}
        />
      ) : null}

      {activeSettingsTab === "household" ? (
        <SettingsHouseholdTab isAnonymous={isAnonymous} />
      ) : null}

      {activeSettingsTab === "account" ? (
        <SettingsAccountTab
          user={user}
          isAnonymous={isAnonymous}
          childProfiles={ctx.childProfiles}
          activeChildId={ctx.activeChildId}
          setActiveChildId={ctx.setActiveChildId}
          newChildName={ctx.newChildName}
          setNewChildName={ctx.setNewChildName}
          newChildAgeRange={ctx.newChildAgeRange}
          setNewChildAgeRange={ctx.setNewChildAgeRange}
          newChildBirthDate={ctx.newChildBirthDate}
          setNewChildBirthDate={ctx.setNewChildBirthDate}
          newChildAgeYears={ctx.newChildAgeYears}
          setNewChildAgeYears={ctx.setNewChildAgeYears}
          agePreviewYears={ctx.agePreviewYears}
          newChildInterests={ctx.newChildInterests}
          setNewChildInterests={ctx.setNewChildInterests}
          newChildNeeds={ctx.newChildNeeds}
          setNewChildNeeds={ctx.setNewChildNeeds}
          editingChildId={ctx.editingChildId}
          startEditingChildProfile={ctx.startEditingChildProfile}
          cancelEditingChildProfile={ctx.cancelEditingChildProfile}
          addChildProfile={ctx.addChildProfile}
          deleteChildProfile={ctx.deleteChildProfile}
          entitlement={ctx.entitlement}
          entitlementHydrated={ctx.entitlementHydrated}
          billing={billing}
          parentPin={ctx.parentPin}
          ParentPinForm={ctx.ParentPinForm}
          saveParentPin={ctx.saveParentPin}
          resetSavedData={ctx.resetSavedData}
        />
      ) : null}
    </section>
  );
}

export default SettingsPage;
