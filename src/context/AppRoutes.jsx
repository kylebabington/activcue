// src/context/AppRoutes.jsx

import { Navigate, Route, Routes } from "react-router-dom";
import ParentPage from "../pages/ParentPage";
import KidPage from "../pages/KidPage";
import QuestPage from "../pages/QuestPage";
import SettingsPage from "../pages/SettingsPage";
import InsightsPage from "../pages/InsightsPage";
import ParentPinGate from "../components/ParentPinGate";
import { defaultParentStatusPresets } from "../constants/presets";
import { getPlayModeUiLine } from "../utils/playModeTheme";
import { trackProductEvent } from "../utils/analytics";

/**
 * Authenticated app routes. Page-specific props stay explicit; domain state
 * for Quest/Settings/Insights comes from context providers above.
 */
export function AppRoutes({
  defaultHomePath,
  parentAreasLocked,
  parentPin,
  parentPinSet,
  setParentAreaUnlocked,
  customParentPresets,
  formatAvailabilityLabel,
  applyMomentDraft,
  saveCustomParentPreset,
  updateCustomParentPreset,
  deleteCustomParentPreset,
  activePresetKey,
  setActivePresetKey,
  firstRunCoach,
  lastSuccessfulMoment,
  currentMoment,
  kidEnergyLevel,
  setKidEnergyLevel,
  kidActivityStyle,
  setKidActivityStyle,
  handleGenerateKidActivities,
  handleStartSomethingForMe,
  isLoading,
  loadingIntent,
  activeChildProfile,
  activityMode,
  childProfiles,
  playingChildIds,
  togglePlayingChild,
  savedActivities,
  activityHistory,
  handleReplaySavedActivity,
  isDemoMode,
  imBoredDisabled,
  handleGetPlus,
  checkoutBusy,
  uiTheme,
  kidDeviceMode,
  gettingBetterCopy,
  setupNudgeNeeded,
}) {
  return (
    <Routes>
      <Route
        path="/app"
        element={<Navigate to={defaultHomePath} replace />}
      />

      <Route path="/demo" element={<Navigate to="/parent" replace />} />

      <Route
        path="/parent"
        element={
          parentAreasLocked ? (
            <ParentPinGate
              parentPin={parentPin}
              parentPinSet={parentPinSet}
              onUnlock={() => setParentAreaUnlocked(true)}
            />
          ) : (
            <ParentPage
              defaultParentStatusPresets={defaultParentStatusPresets}
              customParentPresets={customParentPresets}
              getAvailabilityLabel={formatAvailabilityLabel}
              applyMomentDraft={applyMomentDraft}
              saveCustomParentPreset={saveCustomParentPreset}
              updateCustomParentPreset={updateCustomParentPreset}
              deleteCustomParentPreset={deleteCustomParentPreset}
              activePresetKey={activePresetKey}
              setActivePresetKey={setActivePresetKey}
              firstRunHighlightCooking={firstRunCoach.highlightCooking}
              onFirstRunMomentSet={firstRunCoach.markMomentSet}
              onDismissFirstRun={firstRunCoach.dismiss}
              lastSuccessfulMoment={lastSuccessfulMoment}
            />
          )
        }
      />

      <Route
        path="/kid"
        element={
          <KidPage
            currentMoment={currentMoment}
            kidEnergyLevel={kidEnergyLevel}
            setKidEnergyLevel={setKidEnergyLevel}
            kidActivityStyle={kidActivityStyle}
            setKidActivityStyle={setKidActivityStyle}
            handleGenerateKidActivities={async (options) => {
              trackProductEvent(
                options?.preferSimpleTemplates ? "quick_ideas" : "im_bored"
              );
              return handleGenerateKidActivities(options);
            }}
            handleStartSomethingForMe={handleStartSomethingForMe}
            isLoading={isLoading}
            loadingIntent={loadingIntent}
            activeChildProfile={activeChildProfile}
            activityMode={activityMode}
            childProfiles={childProfiles}
            playingChildIds={playingChildIds}
            togglePlayingChild={togglePlayingChild}
            savedActivities={savedActivities}
            activityHistory={activityHistory}
            handleReplaySavedActivity={handleReplaySavedActivity}
            isDemoMode={isDemoMode}
            imBoredDisabled={imBoredDisabled}
            onGetPlus={isDemoMode ? handleGetPlus : null}
            checkoutBusy={checkoutBusy}
            firstRunPulseImBored={firstRunCoach.pulseImBored}
            onFirstRunGenerated={firstRunCoach.markGenerated}
            playModeLine={getPlayModeUiLine(uiTheme)}
            kidDeviceMode={kidDeviceMode}
            gettingBetterCopy={gettingBetterCopy}
            setupNudgeNeeded={setupNudgeNeeded}
          />
        }
      />

      <Route path="/quest" element={<QuestPage />} />

      <Route
        path="/insights"
        element={
          parentAreasLocked ? (
            <ParentPinGate
              parentPin={parentPin}
              parentPinSet={parentPinSet}
              onUnlock={() => setParentAreaUnlocked(true)}
            />
          ) : (
            <InsightsPage />
          )
        }
      />

      <Route
        path="/settings"
        element={
          parentAreasLocked ? (
            <ParentPinGate
              parentPin={parentPin}
              parentPinSet={parentPinSet}
              onUnlock={() => setParentAreaUnlocked(true)}
            />
          ) : (
            <SettingsPage />
          )
        }
      />
    </Routes>
  );
}
