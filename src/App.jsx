// src/App.jsx

import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "./config/brand.js";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useFirstRunCoach } from "./hooks/useFirstRunCoach";
import { useKidDeviceMode } from "./hooks/useKidDeviceMode";
import { useReadingMode } from "./hooks/useReadingMode";
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
  useActivityPreferences,
  useScoredActivities,
  useStatusMessage,
} from "./features/app";
import { formatAvailabilityLabel } from "./utils/activityFormatters";
import { isFreeImaginativeUnlockUsed } from "./utils/presetDemo";
import { mergeInventoryWithHouseholdBasics } from "./constants/inventoryPresets";
import { kidActivityStyleFromPreference } from "./constants/activityPreferences";

function App() {
  const navigate = useNavigate();
  const { user, isAnonymous } = useAuth();

  const { theme: uiTheme, setTheme: setUiTheme, themes: uiThemes } =
    useUiTheme();

  const { kidDeviceMode, setKidDeviceMode } = useKidDeviceMode();
  const {
    readingModePreference,
    setReadingModePreference,
    updateReadingModeSettings,
  } = useReadingMode();
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
    newChildAvoids,
    setNewChildAvoids,
    newChildIndependenceLevel,
    setNewChildIndependenceLevel,
    editingChildId,
    showChildForm,
    beginAddingChildProfile,
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

  const {
    activityPreferences,
    setActivityPreferences,
    updateActivityPreference,
    assumeHouseholdBasics,
    setAssumeHouseholdBasics,
  } = useActivityPreferences();

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

  useEffect(() => {
    const fromPrefs = kidActivityStyleFromPreference(
      activityPreferences?.activityStylePreference
    );
    if (fromPrefs) {
      setKidActivityStyle(fromPrefs);
    }
  }, [activityPreferences?.activityStylePreference, setKidActivityStyle]);

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
    activeMomentId,
    setActiveMomentId,
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
    getChildIds: () =>
      (childProfiles || []).map((child) => child?.id).filter(Boolean),
    kidMood,
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

  const effectiveInventory = useMemo(
    () =>
      mergeInventoryWithHouseholdBasics(
        normalizedInventory,
        assumeHouseholdBasics
      ),
    [normalizedInventory, assumeHouseholdBasics]
  );

  const {
    scoringOptions,
    scoredActivities,
    gettingBetterCopy,
  } = useScoredActivities({
    activities,
    currentMoment,
    activityHistory,
    activitySessions,
    inventory: effectiveInventory,
    activityMode,
    activeChildId,
    activeChildProfile,
    selectedChildProfiles,
    activityPreferences,
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
    setActivityPreferences,
    setAssumeHouseholdBasics,
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
    activityPreferences,
    assumeHouseholdBasics,
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
    completeListeningIntro,
    setActivityReadingModeEnabled,
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
    readingModePreference,
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
    activeMomentId,
    setActiveMomentId,
    inventory: effectiveInventory,
    kidMood,
    kidEnergyLevel,
    kidActivityStyle,
    effectiveChildAgeRange,
    activeChildProfile,
    selectedChildProfiles,
    safetySettings,
    activityPreferences,
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
    inventory: effectiveInventory,
    currentMoment,
    activeMomentId,
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

  const inventoryEmpty = effectiveInventory.length === 0;
  const childProfilesEmpty = childProfiles.length === 0;
  const setupNudgeNeeded = inventoryEmpty && childProfilesEmpty;
  const needsOnboarding =
    childProfilesEmpty &&
    !onboardingCompletedAt &&
    !onboardingSkippedAt;

  const resetLearnedRecommendations = useCallback(() => {
    const confirmed = window.confirm(
      `Reset what ${BRAND.name} has learned from activity history? Children, supplies, account, and subscription stay.`
    );
    if (!confirmed) {
      return;
    }
    clearActivityHistory();
    setActivitySessions([]);
    showStatus?.(
      "Cleared learned recommendation signals from activity history.",
      "success"
    );
  }, [clearActivityHistory, setActivitySessions, showStatus]);

  const familyContextValue = useMemo(
    () =>
      buildFamilyContextValue({
        currentMoment,
        inventory,
        showStatus,
        safetySettings,
        toggleSafetySetting,
        updateSafetySetting,
        activityPreferences,
        updateActivityPreference,
        assumeHouseholdBasics,
        setAssumeHouseholdBasics,
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
        newChildAvoids,
        setNewChildAvoids,
        newChildIndependenceLevel,
        setNewChildIndependenceLevel,
        editingChildId,
        showChildForm,
        beginAddingChildProfile,
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
        resetLearnedRecommendations,
        resetSavedData,
        uiTheme,
        setUiTheme,
        uiThemes,
        kidDeviceMode,
        setKidDeviceMode,
        readingModePreference,
        setReadingModePreference,
        updateReadingModeSettings,
        reapplyLastSuccessfulMoment,
        setupNudgeNeeded,
        inventoryEmpty,
        gettingBetterCopy,
      }),
    [
      currentMoment,
      inventory,
      showStatus,
      safetySettings,
      toggleSafetySetting,
      updateSafetySetting,
      activityPreferences,
      updateActivityPreference,
      assumeHouseholdBasics,
      setAssumeHouseholdBasics,
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
      newChildAvoids,
      setNewChildAvoids,
      newChildIndependenceLevel,
      setNewChildIndependenceLevel,
      editingChildId,
      showChildForm,
      beginAddingChildProfile,
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
      resetLearnedRecommendations,
      resetSavedData,
      uiTheme,
      setUiTheme,
      uiThemes,
      kidDeviceMode,
      setKidDeviceMode,
      readingModePreference,
      setReadingModePreference,
      updateReadingModeSettings,
      reapplyLastSuccessfulMoment,
      setupNudgeNeeded,
      inventoryEmpty,
      gettingBetterCopy,
    ]
  );

  const questContextValue = useMemo(
    () =>
      buildQuestContextValue({
        currentMoment,
        activeActivity,
        lastCompletedQuest,
        clearLastCompletedQuest,
        handleCompletedQuestMoreLikeThis,
        handleCompletedQuestNeedAnotherIdea,
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
        completeListeningIntro,
        setActivityReadingModeEnabled,
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
      }),
    [
      currentMoment,
      activeActivity,
      lastCompletedQuest,
      clearLastCompletedQuest,
      handleCompletedQuestMoreLikeThis,
      handleCompletedQuestNeedAnotherIdea,
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
      completeListeningIntro,
      setActivityReadingModeEnabled,
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
    ]
  );

  const billingContextValue = useMemo(
    () =>
      buildBillingContextValue({
        entitlement,
        entitlementHydrated,
        refreshEntitlement,
      }),
    [entitlement, entitlementHydrated, refreshEntitlement]
  );

  const activityContextValue = useMemo(
    () =>
      buildActivityContextValue({
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
      }),
    [
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
    ]
  );

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
      isAdmin={Boolean(entitlement?.isAdmin)}
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
          activityPreferences={activityPreferences}
          kidDeviceMode={kidDeviceMode}
          gettingBetterCopy={gettingBetterCopy}
          setupNudgeNeeded={setupNudgeNeeded}
          applyOnboardingDraft={applyOnboardingDraft}
          handleStartActivityFromUi={handleStartActivityFromUi}
          needsOnboarding={needsOnboarding}
        />
      </AppProviders>
    </AppShell>
  );
}

export default App;
