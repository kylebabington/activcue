// src/pages/SettingsPage.jsx

import { useCallback } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../hooks/useAuth";
import { useBillingActions } from "../features/settings/useBillingActions";
import SettingsChildrenSection from "./settings/SettingsChildrenSection";
import SettingsHouseholdSection from "./settings/SettingsHouseholdSection";
import SettingsWhatWeHaveSection from "./settings/SettingsWhatWeHaveSection";
import SettingsRulesSection from "./settings/SettingsRulesSection";
import SettingsDefaultsSection from "./settings/SettingsDefaultsSection";
import SettingsAppearanceSection from "./settings/SettingsAppearanceSection";
import SettingsKidModeSection from "./settings/SettingsKidModeSection";
import SettingsParentPinSection from "./settings/SettingsParentPinSection";
import SettingsPlusSection from "./settings/SettingsPlusSection";
import SettingsSecuritySection from "./settings/SettingsSecuritySection";
import SettingsDataPrivacySection from "./settings/SettingsDataPrivacySection";
import SettingsSupportSection from "./settings/SettingsSupportSection";
import SettingsDangerSection from "./settings/SettingsDangerSection";

const SETTINGS_NAV = [
  {
    id: "family",
    label: "Family",
    items: [
      { id: "family-children", label: "Children" },
      { id: "family-household", label: "Household" },
      { id: "family-supplies", label: "What We Have" },
    ],
  },
  {
    id: "activities",
    label: "Activities",
    items: [
      { id: "activities-rules", label: "Rules" },
      { id: "activities-defaults", label: "Defaults" },
    ],
  },
  {
    id: "app",
    label: "App",
    items: [
      { id: "app-appearance", label: "Appearance" },
      { id: "app-kid-mode", label: "Kid Mode" },
      { id: "app-parent-pin", label: "Parent PIN" },
    ],
  },
  {
    id: "plus",
    label: "Plus",
    items: [{ id: "plus-plan", label: "Plan" }],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { id: "account-security", label: "Security" },
      { id: "account-data", label: "Data & privacy" },
      { id: "account-support", label: "Support" },
      { id: "account-danger", label: "Danger zone" },
    ],
  },
];

const ALL_SECTION_IDS = SETTINGS_NAV.flatMap((group) =>
  group.items.map((item) => item.id)
);

const LEGACY_TAB_MAP = {
  preferences: "activities-rules",
  inventory: "family-supplies",
  household: "family-household",
  history: "family-children",
  account: "account-security",
};

function resolveSettingsSection(stored) {
  if (ALL_SECTION_IDS.includes(stored)) {
    return stored;
  }
  if (LEGACY_TAB_MAP[stored]) {
    return LEGACY_TAB_MAP[stored];
  }
  return "family-children";
}

function SettingsPage() {
  const ctx = useAppContext();
  const { user, isAnonymous } = useAuth();

  const [settingsSection, setSettingsSection] = useLocalStorage(
    "settingsSection",
    "family-children"
  );

  const activeSection = resolveSettingsSection(settingsSection);

  const openPlusSection = useCallback(() => {
    setSettingsSection("plus-plan");
  }, [setSettingsSection]);

  const billing = useBillingActions({
    user,
    isAnonymous,
    refreshEntitlement: ctx.refreshEntitlement,
    onOpenAccountTab: openPlusSection,
  });

  const selectedCount = Array.isArray(ctx.inventory) ? ctx.inventory.length : 0;

  return (
    <section className="page-layout page-layout--parent settings-page">
      <header className="settings-page-header">
        <h1>Settings</h1>
        <p>Manage your family and how FamilyFlow works.</p>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings">
          {SETTINGS_NAV.map((group) => (
            <div key={group.id} className="settings-nav-group">
              <p className="settings-nav-group-label">{group.label}</p>
              <ul className="settings-nav-list">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={
                          isActive
                            ? "settings-nav-item settings-nav-item--active"
                            : "settings-nav-item"
                        }
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setSettingsSection(item.id)}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="settings-content" role="region" aria-live="polite">
          {activeSection === "family-children" ? (
            <SettingsChildrenSection
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
              newChildAvoids={ctx.newChildAvoids}
              setNewChildAvoids={ctx.setNewChildAvoids}
              newChildIndependenceLevel={ctx.newChildIndependenceLevel}
              setNewChildIndependenceLevel={ctx.setNewChildIndependenceLevel}
              editingChildId={ctx.editingChildId}
              showChildForm={ctx.showChildForm}
              beginAddingChildProfile={ctx.beginAddingChildProfile}
              startEditingChildProfile={ctx.startEditingChildProfile}
              cancelEditingChildProfile={ctx.cancelEditingChildProfile}
              addChildProfile={ctx.addChildProfile}
              deleteChildProfile={ctx.deleteChildProfile}
            />
          ) : null}

          {activeSection === "family-household" ? (
            <SettingsHouseholdSection isAnonymous={isAnonymous} />
          ) : null}

          {activeSection === "family-supplies" ? (
            <SettingsWhatWeHaveSection
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
              assumeHouseholdBasics={ctx.assumeHouseholdBasics}
              setAssumeHouseholdBasics={ctx.setAssumeHouseholdBasics}
              selectedCount={selectedCount}
            />
          ) : null}

          {activeSection === "activities-rules" ? (
            <SettingsRulesSection
              safetySettings={ctx.safetySettings}
              toggleSafetySetting={ctx.toggleSafetySetting}
            />
          ) : null}

          {activeSection === "activities-defaults" ? (
            <SettingsDefaultsSection
              activityPreferences={ctx.activityPreferences}
              updateActivityPreference={ctx.updateActivityPreference}
            />
          ) : null}

          {activeSection === "app-appearance" ? (
            <SettingsAppearanceSection
              uiTheme={ctx.uiTheme}
              setUiTheme={ctx.setUiTheme}
              uiThemes={ctx.uiThemes}
            />
          ) : null}

          {activeSection === "app-kid-mode" ? (
            <SettingsKidModeSection
              kidDeviceMode={ctx.kidDeviceMode}
              setKidDeviceMode={ctx.setKidDeviceMode}
              readingModePreference={ctx.readingModePreference}
              setReadingModePreference={ctx.setReadingModePreference}
              updateReadingModeSettings={ctx.updateReadingModeSettings}
            />
          ) : null}

          {activeSection === "app-parent-pin" ? (
            <SettingsParentPinSection
              parentPin={ctx.parentPin}
              ParentPinForm={ctx.ParentPinForm}
              saveParentPin={ctx.saveParentPin}
            />
          ) : null}

          {activeSection === "plus-plan" ? (
            <SettingsPlusSection
              isAnonymous={isAnonymous}
              entitlement={ctx.entitlement}
              entitlementHydrated={ctx.entitlementHydrated}
              billing={billing}
            />
          ) : null}

          {activeSection === "account-security" ? (
            <SettingsSecuritySection user={user} isAnonymous={isAnonymous} />
          ) : null}

          {activeSection === "account-data" ? (
            <SettingsDataPrivacySection
              clearActivityHistory={ctx.clearActivityHistory}
              resetLearnedRecommendations={ctx.resetLearnedRecommendations}
              activityHistoryCount={
                Array.isArray(ctx.activityHistory)
                  ? ctx.activityHistory.length
                  : 0
              }
            />
          ) : null}

          {activeSection === "account-support" ? (
            <SettingsSupportSection />
          ) : null}

          {activeSection === "account-danger" ? (
            <SettingsDangerSection
              isAnonymous={isAnonymous}
              resetSavedData={ctx.resetSavedData}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
