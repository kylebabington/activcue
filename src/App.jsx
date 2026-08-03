// src/App.jsx

import { useNavigate } from "react-router-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { signOutCurrentUser } from "./api/authApi";
import { redirectToCheckout } from "./api/billingApi";
import { ApiRequestError } from "./api/apiClient";
import { listActivitySessions, resetFamilyData } from "./api/familyMemoryApi";
import {
  fetchPlanBActivities,
  fetchRescueActivities,
} from "./api/sharedActivitiesApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useFirstRunCoach } from "./hooks/useFirstRunCoach";
import { useKidDeviceMode } from "./hooks/useKidDeviceMode";
import { useAuth } from "./hooks/useAuth";
import { useUiTheme } from "./hooks/useUiTheme";
import { useEntitlement } from "./features/billing";
import ParentPinForm from "./components/ParentPinForm";
import AppHeader from "./components/AppHeader";
import { AppProviders } from "./context/AppProviders";
import { AppRoutes } from "./context/AppRoutes";
import "./App.css";
import { inventoryCategories } from "./constants/presets";
import { inventoryPresets } from "./constants/inventoryPresets";
import {
  buildDefaultFamilySettings,
  clearFamilySettingsLocalStorage,
  saveFamilySettings,
  saveParentPin as saveParentPinRemote,
  useFamilySettings,
  useFamilyMemory,
  useInventory,
  useChildProfiles,
  useParentMoment,
} from "./features/family";
import { useQuestSession } from "./features/quest";
import {
  logActivityScoreTable,
  scoreActivitiesForCurrentMoment,
  useActivityGeneration,
  useActivityFeedback,
  buildFeedbackIntent,
  intentToLegacyFeedbackContext,
} from "./features/activities";
import {
  formatAvailabilityLabel,
  formatFeedbackLabel,
  formatTimer,
} from "./utils/activityFormatters";
import { isFreeImaginativeUnlockUsed } from "./utils/presetDemo";
import { buildGettingBetterCopy } from "./utils/confidenceCopy";
import { trackProductEvent } from "./utils/analytics";

function App() {
  const navigate = useNavigate();
  const { user, isAnonymous } = useAuth();

  const { theme: uiTheme, setTheme: setUiTheme, themes: uiThemes } =
    useUiTheme();

  const {
    kidDeviceMode,
    setKidDeviceMode,
  } = useKidDeviceMode();

  const firstRunCoach = useFirstRunCoach();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("kid") === "1") {
        setKidDeviceMode(true);
      }
    } catch {
      // Ignore malformed search strings.
    }
  }, [setKidDeviceMode]);

  const [headerLogoutBusy, setHeaderLogoutBusy] = useState(false);
  const [headerLogoutError, setHeaderLogoutError] = useState("");
  const [parentPin, setParentPin] = useLocalStorage("parentPin", "");
  const [parentPinSet, setParentPinSet] = useState(Boolean(parentPin));
  const [parentAreaUnlocked, setParentAreaUnlocked] = useState(false);
  const [, setParentStatus] = useLocalStorage("parentStatus", {
    activity: "Cleaning the kitchen",
    availability: "helper-welcome",
  });

  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");

  function showStatus(message, type = "info") {
    if (!message) {
      setStatusMessage("");
      setStatusType("info");
      return;
    }

    setStatusMessage(message);
    setStatusType(type);
  }

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

  const [safetySettings, setSafetySettings] = useState(
    () => buildDefaultFamilySettings().safetySettings
  );

  const [activities, setActivities] = useState([]);
  const [activitySessions, setActivitySessions] = useState([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

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

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    listActivitySessions({ limit: 80 }, { expectedUserId: user.id })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        const sessions = Array.isArray(payload?.activitySessions)
          ? payload.activitySessions
          : [];
        setActivitySessions(sessions);
      })
      .catch((error) => {
        console.warn("Could not load activity sessions:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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

  const scoringOptions = useMemo(
    () => ({
      inventory,
      activeChildId: activityMode === "family" ? "" : activeChildId || "",
    }),
    [inventory, activityMode, activeChildId]
  );

  const scoredActivities = useMemo(() => {
    return scoreActivitiesForCurrentMoment({
      activities,
      currentMoment,
      activityHistory,
      activitySessions,
      scoringOptions,
      activityMode,
    });
  }, [
    activities,
    currentMoment,
    activityHistory,
    scoringOptions,
    activitySessions,
    activityMode,
  ]);

  useEffect(() => {
    if (activities.length === 0) {
      return;
    }

    logActivityScoreTable(
      scoredActivities,
      currentMoment,
      activityHistory,
      scoringOptions
    );
  }, [
    activities.length,
    scoredActivities,
    currentMoment,
    activityHistory,
    scoringOptions,
  ]);

  const gettingBetterCopy = useMemo(
    () =>
      buildGettingBetterCopy(activitySessions, {
        childId: activityMode === "family" ? "" : activeChildId || "",
        childName: activeChildProfile?.name || "",
      }),
    [activitySessions, activityMode, activeChildId, activeChildProfile]
  );

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

  useEffect(() => {
    if (!activeActivity?.id) {
      return;
    }

    document
      .getElementById("active-activity-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeActivity?.id]);

  function updateSafetySetting(settingName, newValue) {
    setSafetySettings({
      ...safetySettings,
      [settingName]: newValue,
    });
  }

  function toggleSafetySetting(settingName) {
    setSafetySettings({
      ...safetySettings,
      [settingName]: !safetySettings[settingName],
    });
  }

  async function saveParentPin(newPin) {
    const cleanedPin = newPin.trim();

    if (cleanedPin.length < 4) {
      showStatus("PIN must be at least 4 digits.", "error");
      return;
    }

    try {
      await saveParentPinRemote(cleanedPin, {
        expectedUserId: user?.id,
      });
      setParentPin(cleanedPin);
      setParentPinSet(true);
      showStatus("Parent PIN saved.", "success");
    } catch (error) {
      console.error("Could not save parent PIN:", error);
      /*
       * Fall back to local PIN if settings row is not ready yet.
       */
      setParentPin(cleanedPin);
      setParentPinSet(true);
      showStatus(
        error instanceof Error
          ? error.message
          : "Parent PIN saved on this device only for now.",
        "info"
      );
    }
  }

  async function handleGetPlus() {
    if (isAnonymous) {
      navigate("/signup");
      return;
    }

    setCheckoutBusy(true);
    setStatusMessage("");
    trackProductEvent("plus_checkout_started");

    try {
      await redirectToCheckout();
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.code === "ACCOUNT_REQUIRED"
      ) {
        navigate("/signup");
        return;
      }

      setStatusMessage(
        error?.message ||
        "Could not start checkout. Try again in a moment."
      );
      setStatusType("error");
      setCheckoutBusy(false);
    }
  }

  async function resetSavedData() {
    const confirmed = window.confirm(
      "Reset all saved family settings, favorites, history, and browser data? Your account and subscription stay. This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    suppressFamilySettingsSavesRef.current = true;

    if (familySettingsSaveTimeoutRef.current !== null) {
      window.clearTimeout(familySettingsSaveTimeoutRef.current);
      familySettingsSaveTimeoutRef.current = null;
    }

    await familySettingsSaveChainRef.current.catch(() => { });

    if (familySettingsSaveTimeoutRef.current !== null) {
      window.clearTimeout(familySettingsSaveTimeoutRef.current);
      familySettingsSaveTimeoutRef.current = null;
    }

    try {
      await resetFamilyData({ expectedUserId: user?.id });

      const resetPromise = saveFamilySettings(
        buildDefaultFamilySettings(),
        {
          expectedUserId: user?.id,
        }
      );

      familySettingsSaveChainRef.current = resetPromise;
      await resetPromise;
    } catch (error) {
      console.error("Could not reset family data:", error);
      suppressFamilySettingsSavesRef.current = false;
      window.alert(
        "Could not reset synced family data on the server. Try again."
      );
      return;
    }

    clearFamilySettingsLocalStorage();
    window.localStorage.removeItem("appMode");
    window.localStorage.removeItem("parentPin");
    window.localStorage.removeItem("parentStatus");
    window.localStorage.removeItem("kidMood");
    window.localStorage.removeItem("kidEnergyLevel");
    window.localStorage.removeItem("kidActivityStyle");
    window.localStorage.removeItem("messLevel");
    window.localStorage.removeItem("locationPreference");
    window.localStorage.removeItem("activitySpace");
    window.localStorage.removeItem("customActivitySpace");
    window.localStorage.removeItem("childAgeRange");
    window.localStorage.removeItem("activityHistory");
    window.localStorage.removeItem("savedActivities");
    window.localStorage.removeItem("lastSuccessfulMoment");
    window.localStorage.removeItem("activeActivity");
    window.localStorage.removeItem("lastCompletedQuest");
    window.localStorage.removeItem("activitySessions");
    window.localStorage.removeItem("uiTheme");
    window.localStorage.removeItem("kidDeviceMode");
    window.location.reload();
  }

  const parentAreasLocked =
    (parentPinSet || Boolean(parentPin)) && !parentAreaUnlocked;
  const defaultHomePath =
    parentPin && inventory.length > 0 ? "/kid" : "/parent";

  const inventoryEmpty = normalizedInventory.length === 0;
  const childProfilesEmpty = childProfiles.length === 0;
  const setupNudgeNeeded = inventoryEmpty && childProfilesEmpty;

  const familyContextValue = {
    currentMoment,
    inventory,
    showStatus,
    safetySettings,
    toggleSafetySetting,
    updateSafetySetting,
    inventoryCategories,
    inventoryPresets,
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
    setActiveChildId: (childId) => applyPlayingSelection([childId]),
    activeChildProfile,
    playingChildIds,
    togglePlayingChild,
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
    kidDeviceMode,
    setKidDeviceMode,
    reapplyLastSuccessfulMoment,
    setupNudgeNeeded,
    inventoryEmpty,
    gettingBetterCopy,
  };

  const questContextValue = {
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
    stepHint,
    isHintLoading,
    handleNeedStepHint,
    formatTimer,
    activities,
    scoredActivities,
    activitySessions,
    isLoading,
    handleStartActivity: handleStartActivityFromUi,
    saveFavoriteActivity,
    handleTooMessy,
    handleTooHard,
    handleNeedQuieter,
    handleMoreLikeThis,
    handleTryNextBest: async () => {
      trackProductEvent("plan_b_offered", { source: "batch" });
      const result = handleTryNextBest(scoredActivities);
      if (result?.usedBatch) {
        trackProductEvent("plan_b_started", { source: "batch" });
        trackProductEvent("plan_b_used", { source: "batch" });
        return;
      }

      const rejected = result?.rejected || scoredActivities[0]?.activity;
      if (rejected) {
        trackProductEvent("plan_b_rejected", {
          source: "batch-exhausted",
        });
      }

      try {
        const response = await fetchPlanBActivities({
          inventory,
          currentMoment,
          excludeCandidateIds: [
            rejected?.candidateId,
            ...scoredActivities
              .map((item) => item?.activity?.candidateId)
              .filter(Boolean),
          ].filter(Boolean),
          excludeCategories: Array.isArray(rejected?.categories)
            ? rejected.categories
            : [],
          limit: 3,
        });
        const next = response?.activities?.[0];
        if (next) {
          trackProductEvent("plan_b_started", { source: "shared-library" });
          trackProductEvent("plan_b_used", { source: "shared-library" });
          handleStartActivityFromUi(next);
          showStatus?.(
            `Plan B from the library: "${next.title}".`,
            "success"
          );
          return;
        }
      } catch (error) {
        console.error("Plan B library lookup failed:", error);
      }

      showStatus?.(
        "No Plan B left in this batch or library. Generating fresh ideas…",
        "info"
      );
      handleGenerateActivities?.();
    },
    handleAutoPickQuest,
    gettingBetterCopy,
    setupNudgeNeeded,
    inventoryEmpty,
    entitlement,
    entitlementHydrated,
  };

  const billingContextValue = {
    entitlement,
    entitlementHydrated,
    refreshEntitlement,
  };

  const activityContextValue = {
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
  };

  if (familySettingsError) {
    return (
      <main
        role="alert"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <section>
          <p>{familySettingsError}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (!familySettingsReady) {
    return (
      <main
        role="status"
        aria-live="polite"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
        }}
      >
        <p>Loading family settings…</p>
      </main>
    );
  }

  return (
    <main className={`app-shell${kidDeviceMode ? " app-shell--kid-device" : ""}`}>
      <AppHeader
        kidDeviceMode={kidDeviceMode}
        parentAreasLocked={parentAreasLocked}
        isAnonymous={isAnonymous}
        headerLogoutBusy={headerLogoutBusy}
        headerLogoutError={headerLogoutError}
        uiTheme={uiTheme}
        setUiTheme={setUiTheme}
        uiThemes={uiThemes}
        onLogout={async () => {
          setHeaderLogoutError("");
          setHeaderLogoutBusy(true);

          try {
            await signOutCurrentUser();
            window.location.assign("/login");
          } catch (error) {
            console.error("Could not log out:", error);
            setHeaderLogoutError(
              error instanceof Error
                ? error.message
                : "Could not log out. Try again."
            );
            setHeaderLogoutBusy(false);
          }
        }}
      />

      {familySettingsSaveStatus === "error" ? (
        <div
          className="status-message status-message--error family-settings-save-error"
          role="alert"
        >
          <p>
            Your latest changes were not saved. Check your connection and try
            again.
          </p>
          <button type="button" onClick={retryFamilySettingsSave}>
            Try again
          </button>
        </div>
      ) : null}

      {statusMessage && (
        <p
          className={`status-message status-message--${statusType}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}

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
        />
      </AppProviders>
    </main>
  );
}

export default App;
