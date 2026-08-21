// src/features/family/useFamilySettings.js

import { useEffect, useRef, useState } from "react";
import {
  getFamilySettings,
  saveFamilySettings,
} from "../../api/familySettingsApi";
import { AuthenticationError } from "../../api/apiClient";
import {
  clearFamilySettingsLocalStorage,
  familySettingsPayloadFromState,
  normalizeFamilySettingsDocument,
  readFamilySettingsFromLocalStorage,
} from "../../constants/familySettingsDefaults";

function parentStatusFromMoment(moment) {
  return {
    activity: moment.parentActivity,
    availability: moment.availability,
  };
}

/*
 * Hydrate family settings from the server (or one-time localStorage import),
 * then debounce PUTs when App state changes. Race guards keep stale hydrates
 * and in-flight saves from writing across user switches.
 */
export function useFamilySettings({
  userId,
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
  playingChildIds,
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
  onboardingVersion = null,
  onboardingCompletedAt = null,
  onboardingSkippedAt = null,
} = {}) {
  const [familySettingsReady, setFamilySettingsReady] = useState(false);
  const [familySettingsError, setFamilySettingsError] = useState("");
  const [familySettingsSaveStatus, setFamilySettingsSaveStatus] =
    useState("saved");

  const skipNextFamilySettingsSaveRef = useRef(true);
  const familySettingsHydrateUserIdRef = useRef(null);
  const familySettingsSaveTimeoutRef = useRef(null);
  const familySettingsSaveChainRef = useRef(Promise.resolve());
  const suppressFamilySettingsSavesRef = useRef(false);

  function applyFamilySettingsDocument(settings, localMemory = {}) {
    const normalized = normalizeFamilySettingsDocument(settings, localMemory);

    setActivityMode(normalized.activityMode);
    setActiveChildId(normalized.activeChildId);
    setActivePresetKey(normalized.activeParentPresetKey);
    setChildProfiles(normalized.childProfiles);
    setPlayingChildIds(normalized.playingChildIds);
    setInventory(normalized.inventory);
    setSafetySettings(normalized.safetySettings);
    setActivityPreferences?.(normalized.activityPreferences);
    setAssumeHouseholdBasics?.(normalized.assumeHouseholdBasics !== false);
    setCurrentMoment(normalized.currentMoment);
    setCustomParentPresets(normalized.customParentPresets);
    setParentStatus(parentStatusFromMoment(normalized.currentMoment));
    setLastSuccessfulMoment(normalized.lastSuccessfulMoment);
    setUiTheme?.(normalized.uiTheme);
    setKidDeviceMode?.(normalized.kidDeviceMode);
    setParentPinSet?.(normalized.parentPinSet === true);
    setOnboardingVersion?.(normalized.onboardingVersion);
    setOnboardingCompletedAt?.(normalized.onboardingCompletedAt);
    setOnboardingSkippedAt?.(normalized.onboardingSkippedAt);
  }

  /*
   * Serialize family-settings PUTs so an older in-flight request cannot
   * overwrite a newer payload when the server upserts unconditionally.
   */
  function queueFamilySettingsSave(payload, saveUserId) {
    const savePromise = familySettingsSaveChainRef.current
      .catch(() => {
        // Allow the queue to continue after an earlier failure.
      })
      .then(async () => {
        if (suppressFamilySettingsSavesRef.current) {
          return;
        }

        if (familySettingsHydrateUserIdRef.current !== saveUserId) {
          return;
        }

        setFamilySettingsSaveStatus("saving");

        try {
          await saveFamilySettings(payload, {
            expectedUserId: saveUserId,
          });

          if (familySettingsHydrateUserIdRef.current !== saveUserId) {
            return;
          }

          setFamilySettingsSaveStatus("saved");
        } catch (error) {
          console.error("Could not save family settings:", error);

          if (familySettingsHydrateUserIdRef.current !== saveUserId) {
            return;
          }

          setFamilySettingsSaveStatus("error");
          throw error;
        }
      });

    familySettingsSaveChainRef.current = savePromise;

    return savePromise;
  }

  function buildCurrentFamilySettingsPayload() {
    return familySettingsPayloadFromState({
      activityMode,
      activeChildId,
      playingChildIds,
      activeParentPresetKey: activePresetKey,
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
  }

  function retryFamilySettingsSave() {
    if (!userId || suppressFamilySettingsSavesRef.current) {
      return;
    }

    queueFamilySettingsSave(buildCurrentFamilySettingsPayload(), userId);
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateFamilySettings() {
      if (!userId) {
        return;
      }

      const hydrateUserId = userId;

      setFamilySettingsReady(false);
      setFamilySettingsError("");
      setFamilySettingsSaveStatus("saved");
      skipNextFamilySettingsSaveRef.current = true;
      familySettingsHydrateUserIdRef.current = hydrateUserId;

      function isCurrentHydrate() {
        return (
          isMounted &&
          familySettingsHydrateUserIdRef.current === hydrateUserId
        );
      }

      function abandonStaleHydrate() {
        /*
         * A newer hydrate for a different user started. Drop legacy keys so
         * that account cannot import this browser document. Same-user
         * StrictMode remounts keep the same hydrateUserId on the ref, so
         * keys are left for the remounted effect to finish importing.
         */
        if (familySettingsHydrateUserIdRef.current !== hydrateUserId) {
          clearFamilySettingsLocalStorage();
        }
      }

      try {
        const response = await getFamilySettings({
          expectedUserId: hydrateUserId,
        });

        if (!isCurrentHydrate()) {
          abandonStaleHydrate();
          return;
        }

        if (response.exists && response.settings) {
          const localLegacy = readFamilySettingsFromLocalStorage();
          applyFamilySettingsDocument(response.settings, {
            lastSuccessfulMoment: localLegacy.lastSuccessfulMoment,
          });
        } else {
          const imported = readFamilySettingsFromLocalStorage();

          /*
           * Re-check before the import PUT. authenticatedRequest also refuses
           * to send if the live Supabase session user no longer matches, so
           * localStorage from user A cannot be written under user B's token.
           */
          if (!isCurrentHydrate()) {
            abandonStaleHydrate();
            return;
          }

          const saved = await saveFamilySettings(imported, {
            expectedUserId: hydrateUserId,
          });

          /*
           * Clear legacy keys as soon as the import PUT succeeds for this
           * hydrate user — even if the effect already unmounted — so a later
           * sign-in cannot re-import them. Only apply React state when this
           * hydrate is still current.
           */
          clearFamilySettingsLocalStorage();

          if (!isCurrentHydrate()) {
            return;
          }

          applyFamilySettingsDocument(saved.settings || imported);
        }

        if (!isCurrentHydrate()) {
          abandonStaleHydrate();
          return;
        }

        /*
         * Always clear legacy keys after a successful hydrate.
         *
         * If we only cleared on import, a later sign-in for a different user
         * with no server row could re-import the previous account's settings.
         */
        clearFamilySettingsLocalStorage();
        setFamilySettingsReady(true);
      } catch (error) {
        console.error("Could not hydrate family settings:", error);

        if (
          error instanceof AuthenticationError &&
          error.code === "AUTH_SESSION_CHANGED"
        ) {
          clearFamilySettingsLocalStorage();
        }

        if (!isCurrentHydrate()) {
          return;
        }

        setFamilySettingsError(
          error instanceof Error
            ? error.message
            : "Could not load family settings."
        );
        setFamilySettingsReady(false);
      }
    }

    hydrateFamilySettings();

    return () => {
      isMounted = false;
    };
    // applyFamilySettingsDocument only calls React setters + a module helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per user id
  }, [userId]);

  useEffect(() => {
    if (!familySettingsReady || !userId) {
      return;
    }

    if (familySettingsHydrateUserIdRef.current !== userId) {
      return;
    }

    if (suppressFamilySettingsSavesRef.current) {
      return;
    }

    if (skipNextFamilySettingsSaveRef.current) {
      skipNextFamilySettingsSaveRef.current = false;
      return;
    }

    const payload = familySettingsPayloadFromState({
      activityMode,
      activeChildId,
      playingChildIds,
      activeParentPresetKey: activePresetKey,
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
    const saveUserId = userId;

    familySettingsSaveTimeoutRef.current = window.setTimeout(() => {
      familySettingsSaveTimeoutRef.current = null;

      if (suppressFamilySettingsSavesRef.current) {
        return;
      }

      if (familySettingsHydrateUserIdRef.current !== saveUserId) {
        return;
      }

      queueFamilySettingsSave(payload, saveUserId);
    }, 400);

    return () => {
      if (familySettingsSaveTimeoutRef.current !== null) {
        window.clearTimeout(familySettingsSaveTimeoutRef.current);
        familySettingsSaveTimeoutRef.current = null;
      }
    };
  }, [
    familySettingsReady,
    userId,
    activityMode,
    activeChildId,
    playingChildIds,
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
  ]);

  return {
    familySettingsReady,
    familySettingsError,
    familySettingsSaveStatus,
    retryFamilySettingsSave,
    suppressFamilySettingsSavesRef,
    familySettingsSaveTimeoutRef,
    familySettingsSaveChainRef,
  };
}
