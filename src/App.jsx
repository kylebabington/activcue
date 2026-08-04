// src/App.jsx

import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useFirstRunCoach } from "./hooks/useFirstRunCoach";
import { useKidDeviceMode } from "./hooks/useKidDeviceMode";
import { useAuth } from "./hooks/useAuth";
import { useUiTheme } from "./hooks/useUiTheme";
import { useEntitlement } from "./features/billing";
import {
  AppShell,
  AppShellError,
  AppShellLoading,
} from "./components/AppShell";
import { AppProviders } from "./context/AppProviders";
import { AppRoutes } from "./context/AppRoutes";
import "./App.css";
import {
  useFamilySettings,
  useFamilyMemory,
  useInventory,
  useChildProfiles,
  useParentMoment,
} from "./features/family";
import { useQuestSession } from "./features/quest";
import {
  useActivityGeneration,
  useActivityFeedback,
  buildFeedbackIntent,
  intentToLegacyFeedbackContext,
} from "./features/activities";
import {
  buildActivityContextValue,
  buildBillingContextValue,
  buildFamilyContextValue,
  buildQuestContextValue,
  useActivitySessions,
  useFamilyDataReset,
  useHeaderLogout,
  useOnboardingDraft,
  useParentPinGate,
  usePlanBRescue,
  usePlusCheckout,
  useSafetySettings,
  useScoredActivities,
  useStatusMessage,
} from "./features/app";
import { formatAvailabilityLabel } from "./utils/activityFormatters";
import { isFreeImaginativeUnlockUsed } from "./utils/presetDemo";

function App() {
  const navigate = useNavigate();
  const { user, isAnonymous } = useAuth();

  const { theme: uiTheme, setTheme: setUiTheme, themes: uiThemes } =
    useUiTheme();

  const { kidDeviceMode, setKidDeviceMode } = useKidDeviceMode();
  const firstRunCoach = useFirstRunCoach();

  const {
    statusMessage,
    statusType,
    setStatusMessage,
    setStatusType,
    showStatus,
  } = useStatusMessage();

  const {
    headerLogoutBusy,
    headerLogoutError,
    handleHeaderLogout,
  } = useHeaderLogout();

  const {
    parentPin,
    parentPinSet,
    setParentPinSet,
    setParentAreaUnlocked,
    parentAreasLocked,
    saveParentPin,
  } = useParentPinGate({
    userId: user?.id,
    showStatus,
  });

  const [, setParentStatus] = useLocalStorage("parentStatus", {
    activity: "Cleaning the kitchen",
    availability: "helper-welcome",
  });

  const {
    inventory,
    setInventory,
    newInventoryItem,
    setNewInventoryItem,
    newInventoryCategory,
    setNewInventoryCategory,
    normalizedInventory,
    customInventoryItems,
    addInventoryItem,
    removeInventoryItem,
    isInventoryItemSelected,
    toggleInventoryPreset,
  } = useInventory({ showStatus });

  const [childAgeRange] = useLocalStorage("childAgeRange", "6-9");

  const {
    childProfiles,
    setChildProfiles,
    activeChildId,
    setActiveChildId,
    playingChildIds,
    setPlayingChildIds,
    activityMode,
    setActivityMode,
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
    applyPlayingSelection,
    togglePlayingChild,
    addChildProfile,
    startEditingChildProfile,
    cancelEditingChildProfile,
    deleteChildProfile,
    activeChildProfile,
    selectedChildProfiles,
    effectiveChildAgeRange,
  } = useChildProfiles({
    showStatus,
    childAgeRangeFallback: childAgeRange,
  });

  const [lastSuccessfulMoment, setLastSuccessfulMoment] = useLocalStorage(
    "lastSuccessfulMoment",
    null
  );

  const {
    safetySettings,
    setSafetySettings,
    updateSafetySetting,
    toggleSafetySetting,
  } = useSafetySettings();

  const [activities, setActivities] = useState([]);
  const { activitySessions, setActivitySessions } = useActivitySessions({
    userId: user?.id,
  });

  const { checkoutBusy, handleGetPlus } = usePlusCheckout({
    isAnonymous,
    navigate,
    setStatusMessage,
    setStatusType,
  });

  const [kidMood, setKidMood] = useLocalStorage("kidMood", "neutral");
  const [kidEnergyLevel, setKidEnergyLevel] = useLocalStorage(
    "kidEnergyLevel",
    "neutral"
  );
  const [kidActivityStyle, setKidActivityStyle] = useLocalStorage(
    "kidActivityStyle",
    "simple"
  );
  const [messLevel] = useLocalStorage("messLevel", "low");
  const [locationPreference] = useLocalStorage(
    "locationPreference",
    "indoor"
  );

  const {
    savedActivities,
    activityHistory,
    persistFavorite,
    removeFavorite,
    appendHistory,
    clearHistory,
  } = useFamilyMemory({ userId: user?.id });

  const saveActivityFeedbackRef = useRef(null);
  const handleStartActivityRef = useRef(null);
  const setLastCompletedQuestBridge = useRef(null);

  const {
    entitlement,
    entitlementHydrated,
    mergePresetEntitlement,
    refreshEntitlement,
  } = useEntitlement({ userId: user?.id });

  const isDemoMode =
    entitlementHydrated && !entitlement.canGenerateWithAi;
  const freeImaginativeUnlockUsed = isFreeImaginativeUnlockUsed(entitlement);
  const imBoredDisabled = isDemoMode && freeImaginativeUnlockUsed;

  const {
    currentMoment,
    setCurrentMoment,
    customParentPresets,
    setCustomParentPresets,
    activePresetKey,
    setActivePresetKey,
    applyMomentDraft,
    saveCustomParentPreset,
    updateCustomParentPreset,
    deleteCustomParentPreset,
    reapplyLastSuccessfulMoment,
  } = useParentMoment({
    showStatus,
    navigate,
    firstRunCoach,
    setParentStatus,
    lastSuccessfulMoment,
    setLastCompletedQuest: (value) => {
      setLastCompletedQuestBridge.current?.(value);
    },
  });

  const {
    onboardingVersion,
    setOnboardingVersion,
    onboardingCompletedAt,
    setOnboardingCompletedAt,
    onboardingSkippedAt,
    setOnboardingSkippedAt,
    applyOnboardingDraft,
  } = useOnboardingDraft({
    setChildProfiles,
    applyPlayingSelection,
    setInventory,
    applyMomentDraft,
  });

  const {
    scoringOptions,
    scoredActivities,
    gettingBetterCopy,
  } = useScoredActivities({
    activities,
    currentMoment,
    activityHistory,
    activitySessions,
    inventory,
    activityMode,
    activeChildId,
    activeChildProfile,
    selectedChildProfiles,
  });

  const {
    familySettingsReady,
    familySettingsError,
    familySettingsSaveStatus,
    retryFamilySettingsSave,
    suppressFamilySettingsSavesRef,
    familySettingsSaveTimeoutRef,
    familySettingsSaveChainRef,
  } = useFamilySettings({
    userId: user?.id,
    setActivityMode,
    setActiveChildId,
    setActivePresetKey,
    setChildProfiles,
    setPlayingChildIds,
    setInventory,
    setSafetySettings,
    setCurrentMoment,
    setCustomParentPresets,
    setParentStatus,
    setLastSuccessfulMoment,
    setUiTheme,
    setKidDeviceMode,
    setParentPinSet,
    setOnboardingVersion,
    setOnboardingCompletedAt,
    setOnboardingSkippedAt,
    activityMode,
    activeChildId,
    activePresetKey,
    childProfiles,
    inventory,
    safetySettings,
    currentMoment,
    customParentPresets,
    lastSuccessfulMoment,
    uiTheme,
    kidDeviceMode,
    onboardingVersion,
    onboardingCompletedAt,
    onboardingSkippedAt,
  });

  const {
    activeActivity,
    setActiveActivity,
    lastCompletedQuest,
    setLastCompletedQuest,
    clearLastCompletedQuest,
    stepHint,
    isHintLoading,
    timerSecondsRemaining,
    handleStartActivity,
    finishActiveActivity,
    cancelActiveActivity,
    handleTimerNotFinished,
    handleTimerNeedAnotherIdea,
    handleSessionOutcome,
    goToNextQuestStep,
    goToPreviousQuestStep,
    toggleQuestStepComplete,
    toggleShowAllQuestSteps,
    setQuestPhase,
    toggleStarterIdea,
    assignRole,
    toggleBuiltInHelp,
    setOpenSection,
    openRescueSection,
    markRescueModeUsed,
    handleNeedStepHint,
  } = useQuestSession({
    userId: user?.id,
    currentMoment,
    activityMode,
    activeChildProfile,
    selectedChildProfiles,
    kidActivityStyle,
    kidMood,
    messLevel,
    locationPreference,
    effectiveChildAgeRange,
    appendHistory,
    setLastSuccessfulMoment,
    setActivitySessions,
    saveActivityFeedback: (...args) =>
      saveActivityFeedbackRef.current?.(...args),
    showStatus,
    onNeedAnotherIdea: (previousTitle) => {
      const intent = buildFeedbackIntent({
        feedbackIntent: "need-another-idea",
        previousActivityTitle: previousTitle,
        activityStyle: kidActivityStyle,
        energyLevel: kidEnergyLevel || kidMood || "neutral",
      });
      generateActivitiesRef.current?.(intentToLegacyFeedbackContext(intent), {
        generationIntent: intent,
      });
    },
  });

  setLastCompletedQuestBridge.current = setLastCompletedQuest;
  handleStartActivityRef.current = handleStartActivity;

  const {
    isLoading,
    loadingIntent,
    generateActivitiesRef,
    handleGenerateActivities,
    handleGenerateKidActivities,
    handleStartSomethingForMe,
    handleStartActivityFromUi,
    handleAutoPickQuest,
  } = useActivityGeneration({
    showStatus,
    setActivities,
    activities,
    activityHistory,
    activitySessions,
    activityMode,
    activeChildId,
    currentMoment,
    inventory,
    kidMood,
    kidEnergyLevel,
    kidActivityStyle,
    effectiveChildAgeRange,
    activeChildProfile,
    selectedChildProfiles,
    safetySettings,
    uiTheme,
    setKidMood,
    navigate,
    entitlement,
    entitlementHydrated,
    isDemoMode,
    imBoredDisabled,
    freeImaginativeUnlockUsed,
    mergePresetEntitlement,
    handleStartActivity: (...args) =>
      handleStartActivityRef.current?.(...args),
    setActiveActivity,
    clearLastCompletedQuest,
    scoringOptions,
  });

  const {
    saveActivityFeedback,
    saveFavoriteActivity,
    removeSavedActivity,
    handleReplaySavedActivity,
    handleTimerMoreLikeThis,
    handleTooMessy,
    handleTooHard,
    handleTooYoung,
    handleTooOld,
    handleTooEasy,
    handleNeedQuieter,
    handleMoreLikeThis,
    handleTryNextBest,
    handleCompletedQuestMoreLikeThis,
    handleCompletedQuestNeedAnotherIdea,
    clearActivityHistory,
  } = useActivityFeedback({
    kidMood,
    messLevel,
    locationPreference,
    effectiveChildAgeRange,
    activeChildProfile,
    activityMode,
    appendHistory,
    persistFavorite,
    removeFavorite,
    clearHistory,
    savedActivities,
    showStatus,
    navigate,
    handleGenerateActivities,
    handleStartActivity,
    activeActivity,
    setActiveActivity,
    lastCompletedQuest,
    clearLastCompletedQuest,
    kidActivityStyle,
    kidEnergyLevel,
  });

  saveActivityFeedbackRef.current = saveActivityFeedback;

  const { handleTryNextBestWithLibrary } = usePlanBRescue({
    inventory,
    currentMoment,
    scoredActivities,
    handleTryNextBest,
    handleStartActivityFromUi,
    handleGenerateActivities,
    showStatus,
  });

  const { resetSavedData } = useFamilyDataReset({
    userId: user?.id,
    suppressFamilySettingsSavesRef,
    familySettingsSaveTimeoutRef,
    familySettingsSaveChainRef,
  });

  useEffect(() => {
    if (!activeActivity?.id) {
      return;
    }

    document
      .getElementById("active-activity-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeActivity?.id]);

  const defaultHomePath =
    parentPin && inventory.length > 0 ? "/kid" : "/parent";

  const inventoryEmpty = normalizedInventory.length === 0;
  const childProfilesEmpty = childProfiles.length === 0;
  const setupNudgeNeeded = inventoryEmpty && childProfilesEmpty;

  const familyContextValue = buildFamilyContextValue({
    currentMoment,
    inventory,
    showStatus,
    safetySettings,
    toggleSafetySetting,
    updateSafetySetting,
    normalizedInventory,
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
    applyPlayingSelection,
    activeChildProfile,
    selectedChildProfiles,
    playingChildIds,
    togglePlayingChild,
    activityMode,
    setActivityMode,
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
    parentPin,
    saveParentPin,
    savedActivities,
    handleReplaySavedActivity,
    removeSavedActivity,
    activityHistory,
    clearActivityHistory,
    resetSavedData,
    uiTheme,
    setUiTheme,
    uiThemes,
    kidDeviceMode,
    setKidDeviceMode,
    reapplyLastSuccessfulMoment,
    setupNudgeNeeded,
    inventoryEmpty,
    gettingBetterCopy,
  });

  const questContextValue = buildQuestContextValue({
    currentMoment,
    activeActivity,
    lastCompletedQuest,
    clearLastCompletedQuest,
    handleCompletedQuestMoreLikeThis,
    handleCompletedQuestNeedAnotherIdea,
    timerSecondsRemaining,
    finishActiveActivity,
    cancelActiveActivity,
    handleSessionOutcome,
    handleTimerNotFinished,
    handleTimerNeedAnotherIdea,
    handleTimerMoreLikeThis,
    goToNextQuestStep,
    goToPreviousQuestStep,
    toggleQuestStepComplete,
    toggleShowAllQuestSteps,
    setQuestPhase,
    toggleStarterIdea,
    assignRole,
    toggleBuiltInHelp,
    setOpenSection,
    openRescueSection,
    markRescueModeUsed,
    stepHint,
    isHintLoading,
    handleNeedStepHint,
    activities,
    scoredActivities,
    activitySessions,
    isLoading,
    handleStartActivityFromUi,
    saveFavoriteActivity,
    handleTooMessy,
    handleTooHard,
    handleTooYoung,
    handleTooOld,
    handleTooEasy,
    handleNeedQuieter,
    handleMoreLikeThis,
    handleTryNextBestWithLibrary,
    handleAutoPickQuest,
    gettingBetterCopy,
    selectedChildProfiles,
    setupNudgeNeeded,
    inventoryEmpty,
    entitlement,
    entitlementHydrated,
  });

  const billingContextValue = buildBillingContextValue({
    entitlement,
    entitlementHydrated,
    refreshEntitlement,
  });

  const activityContextValue = buildActivityContextValue({
    activities,
    setActivities,
    scoredActivities,
    isLoading,
    loadingIntent,
    handleGenerateActivities,
    handleGenerateKidActivities,
    handleStartSomethingForMe,
    handleStartActivityFromUi,
    handleAutoPickQuest,
    saveFavoriteActivity,
    removeSavedActivity,
    freeImaginativeUnlockUsed,
    imBoredDisabled,
    isDemoMode,
  });

  if (familySettingsError) {
    return <AppShellError message={familySettingsError} />;
  }

  if (!familySettingsReady) {
    return <AppShellLoading />;
  }

  return (
    <AppShell
      kidDeviceMode={kidDeviceMode}
      parentAreasLocked={parentAreasLocked}
      isAnonymous={isAnonymous}
      headerLogoutBusy={headerLogoutBusy}
      headerLogoutError={headerLogoutError}
      uiTheme={uiTheme}
      setUiTheme={setUiTheme}
      uiThemes={uiThemes}
      onLogout={handleHeaderLogout}
      familySettingsSaveStatus={familySettingsSaveStatus}
      retryFamilySettingsSave={retryFamilySettingsSave}
      statusMessage={statusMessage}
      statusType={statusType}
    >
      <AppProviders
        familyContextValue={familyContextValue}
        questContextValue={questContextValue}
        billingContextValue={billingContextValue}
        activityContextValue={activityContextValue}
      >
        <AppRoutes
          defaultHomePath={defaultHomePath}
          parentAreasLocked={parentAreasLocked}
          parentPin={parentPin}
          parentPinSet={parentPinSet}
          setParentAreaUnlocked={setParentAreaUnlocked}
          customParentPresets={customParentPresets}
          formatAvailabilityLabel={formatAvailabilityLabel}
          applyMomentDraft={applyMomentDraft}
          saveCustomParentPreset={saveCustomParentPreset}
          updateCustomParentPreset={updateCustomParentPreset}
          deleteCustomParentPreset={deleteCustomParentPreset}
          activePresetKey={activePresetKey}
          setActivePresetKey={setActivePresetKey}
          firstRunCoach={firstRunCoach}
          lastSuccessfulMoment={lastSuccessfulMoment}
          currentMoment={currentMoment}
          kidEnergyLevel={kidEnergyLevel}
          setKidEnergyLevel={setKidEnergyLevel}
          kidActivityStyle={kidActivityStyle}
          setKidActivityStyle={setKidActivityStyle}
          handleGenerateKidActivities={handleGenerateKidActivities}
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
          handleGetPlus={handleGetPlus}
          checkoutBusy={checkoutBusy}
          uiTheme={uiTheme}
          kidDeviceMode={kidDeviceMode}
          gettingBetterCopy={gettingBetterCopy}
          setupNudgeNeeded={setupNudgeNeeded}
          applyOnboardingDraft={applyOnboardingDraft}
          handleStartActivityFromUi={handleStartActivityFromUi}
        />
      </AppProviders>
    </AppShell>
  );
}

export default App;
