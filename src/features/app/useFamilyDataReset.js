// src/features/app/useFamilyDataReset.js

import {
  buildDefaultFamilySettings,
  clearFamilySettingsLocalStorage,
  saveFamilySettings,
} from "../family";
import { resetFamilyData } from "../../api/familyMemoryApi";

const LOCAL_STORAGE_KEYS_TO_CLEAR = [
  "appMode",
  "parentPin",
  "parentStatus",
  "kidMood",
  "kidEnergyLevel",
  "kidActivityStyle",
  "messLevel",
  "locationPreference",
  "activitySpace",
  "customActivitySpace",
  "childAgeRange",
  "activityHistory",
  "savedActivities",
  "lastSuccessfulMoment",
  "activeActivity",
  "lastCompletedQuest",
  "activitySessions",
  "uiTheme",
  "kidDeviceMode",
  "readingMode",
];

export function useFamilyDataReset({
  userId,
  suppressFamilySettingsSavesRef,
  familySettingsSaveTimeoutRef,
  familySettingsSaveChainRef,
} = {}) {
  async function resetSavedData() {
    const confirmed = window.confirm(
      "Reset all saved family settings, favorites, history, and browser data? Your account and subscription stay. This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    if (suppressFamilySettingsSavesRef) {
      suppressFamilySettingsSavesRef.current = true;
    }

    if (familySettingsSaveTimeoutRef?.current !== null) {
      window.clearTimeout(familySettingsSaveTimeoutRef.current);
      familySettingsSaveTimeoutRef.current = null;
    }

    await familySettingsSaveChainRef?.current?.catch(() => {});

    if (familySettingsSaveTimeoutRef?.current !== null) {
      window.clearTimeout(familySettingsSaveTimeoutRef.current);
      familySettingsSaveTimeoutRef.current = null;
    }

    try {
      await resetFamilyData({ expectedUserId: userId });

      const resetPromise = saveFamilySettings(buildDefaultFamilySettings(), {
        expectedUserId: userId,
      });

      if (familySettingsSaveChainRef) {
        familySettingsSaveChainRef.current = resetPromise;
      }
      await resetPromise;
    } catch (error) {
      console.error("Could not reset family data:", error);
      if (suppressFamilySettingsSavesRef) {
        suppressFamilySettingsSavesRef.current = false;
      }
      window.alert(
        "Could not reset synced family data on the server. Try again."
      );
      return;
    }

    clearFamilySettingsLocalStorage();
    for (const key of LOCAL_STORAGE_KEYS_TO_CLEAR) {
      window.localStorage.removeItem(key);
    }
    window.location.reload();
  }

  return { resetSavedData };
}
