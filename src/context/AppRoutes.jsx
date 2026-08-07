// src/context/AppRoutes.jsx

import { lazy, Suspense, useCallback } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ParentPinGate from "../components/ParentPinGate";
import { defaultParentStatusPresets } from "../constants/presets";
import { trackProductEvent } from "../utils/analytics";

const ParentPage = lazy(() => import("../pages/ParentPage"));
const KidPage = lazy(() => import("../pages/KidPage"));
const QuestPage = lazy(() => import("../pages/QuestPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const MyActivitiesPage = lazy(() => import("../pages/MyActivitiesPage"));
const InsightsPage = lazy(() => import("../pages/InsightsPage"));
const OnboardingPage = lazy(() => import("../pages/OnboardingPage"));
const AdminGrowthPage = lazy(() => import("../pages/AdminGrowthPage"));

function RouteFallback() {
  return (
    <section className="panel loading-panel">
      <h2>Loading…</h2>
    </section>
  );
}

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
  activityPreferences,
  kidDeviceMode,
  gettingBetterCopy,
  setupNudgeNeeded,
  applyOnboardingDraft,
  handleStartActivityFromUi,
}) {
  const onGenerateKidActivities = useCallback(
    async (options) => {
      trackProductEvent(
        options?.preferSimpleTemplates ? "quick_ideas" : "im_bored"
      );
      return handleGenerateKidActivities(options);
    },
    [handleGenerateKidActivities]
  );

  return (
    <Routes>
      <Route
        path="/app"
        element={<Navigate to={defaultHomePath} replace />}
      />

      <Route
        path="/onboarding"
        element={
          <Suspense fallback={<RouteFallback />}>
            <OnboardingPage
              applyOnboardingDraft={applyOnboardingDraft}
              handleStartActivity={handleStartActivityFromUi}
            />
          </Suspense>
        }
      />

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
            <Suspense fallback={<RouteFallback />}>
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
            </Suspense>
          )
        }
      />

      <Route
        path="/kid"
        element={
          <Suspense fallback={<RouteFallback />}>
            <KidPage
              currentMoment={currentMoment}
              kidEnergyLevel={kidEnergyLevel}
              setKidEnergyLevel={setKidEnergyLevel}
              kidActivityStyle={kidActivityStyle}
              setKidActivityStyle={setKidActivityStyle}
              handleGenerateKidActivities={onGenerateKidActivities}
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
              playModeLine={
                activityPreferences?.activityStylePreference ===
                "mostly-imaginative"
                  ? "Preferring imaginative ideas from your family defaults."
                  : activityPreferences?.activityStylePreference ===
                      "mostly-simple"
                    ? "Preferring simple ideas from your family defaults."
                    : ""
              }
              kidDeviceMode={kidDeviceMode}
              gettingBetterCopy={gettingBetterCopy}
              setupNudgeNeeded={setupNudgeNeeded}
            />
          </Suspense>
        }
      />

      <Route
        path="/quest"
        element={
          <Suspense fallback={<RouteFallback />}>
            <QuestPage />
          </Suspense>
        }
      />

      <Route
        path="/my-activities"
        element={
          parentAreasLocked ? (
            <ParentPinGate
              parentPin={parentPin}
              parentPinSet={parentPinSet}
              onUnlock={() => setParentAreaUnlocked(true)}
            />
          ) : (
            <Suspense fallback={<RouteFallback />}>
              <MyActivitiesPage />
            </Suspense>
          )
        }
      />

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
            <Suspense fallback={<RouteFallback />}>
              <InsightsPage />
            </Suspense>
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
            <Suspense fallback={<RouteFallback />}>
              <SettingsPage />
            </Suspense>
          )
        }
      />

      <Route
        path="/admin/growth"
        element={
          <Suspense fallback={<RouteFallback />}>
            <AdminGrowthPage />
          </Suspense>
        }
      />
    </Routes>
  );
}

/** Prefetch route chunks on nav hover/focus so first visit feels instant. */
export function prefetchAppRoute(path) {
  if (path === "/parent") {
    void import("../pages/ParentPage");
  } else if (path === "/kid") {
    void import("../pages/KidPage");
  } else if (path === "/quest") {
    void import("../pages/QuestPage");
  } else if (path === "/settings") {
    void import("../pages/SettingsPage");
  } else if (path === "/my-activities") {
    void import("../pages/MyActivitiesPage");
  } else if (path === "/insights") {
    void import("../pages/InsightsPage");
  } else if (path === "/admin/growth") {
    void import("../pages/AdminGrowthPage");
  }
}
