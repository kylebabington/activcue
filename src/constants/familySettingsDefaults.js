// src/constants/familySettingsDefaults.js

import { buildDefaultInventory } from "./inventoryPresets";

export const FAMILY_SETTINGS_LOCAL_KEYS = [
    "currentMoment",
    "customParentPresets",
    "activeParentPresetKey",
    "inventory",
    "activityMode",
    "childProfiles",
    "activeChildId",
    "safetySettings",
    "savedActivities",
    "activityHistory",
    "lastSuccessfulMoment",
];

export const DEFAULT_CURRENT_MOMENT = {
    parentActivity: "Cleaning the kitchen",
    availability: "helper-welcome",
    timeNeededMinutes: 20,
    space: "Living room",
    messLevel: "low",
    noiseLevel: "normal",
    supervisionLevel: "independent",
};

export const DEFAULT_SAFETY_SETTINGS = {
    screenFreeOnly: true,
    noFoodActivities: false,
    noWaterPlay: true,
    noSmallObjects: true,
    quietMode: false,
    maxActivityMinutes: 30,
    adultHelpAllowed: "optional",
};

export function buildDefaultFamilySettings() {
    return {
        activityMode: "single-child",
        activeChildId: "",
        activeParentPresetKey: "",
        childProfiles: [],
        inventory: buildDefaultInventory(),
        safetySettings: { ...DEFAULT_SAFETY_SETTINGS },
        currentMoment: { ...DEFAULT_CURRENT_MOMENT },
        customParentPresets: [],
        savedActivities: [],
        activityHistory: [],
        lastSuccessfulMoment: null,
    };
}

function readLocalJson(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);

        if (raw === null) {
            return fallback;
        }

        return JSON.parse(raw);
    } catch (error) {
        console.error(
            `Error reading localStorage key "${key}" for family settings import:`,
            error
        );

        return fallback;
    }
}

/*
 * Build an import payload from legacy localStorage keys.
 *
 * Missing keys fall back to defaults so the first PUT is always complete.
 */
export function readFamilySettingsFromLocalStorage() {
    const defaults = buildDefaultFamilySettings();

    const activityMode = readLocalJson(
        "activityMode",
        defaults.activityMode
    );

    return {
        activityMode:
            activityMode === "family" ||
            activityMode === "single-child"
                ? activityMode
                : defaults.activityMode,
        activeChildId: readLocalJson(
            "activeChildId",
            defaults.activeChildId
        ),
        activeParentPresetKey: readLocalJson(
            "activeParentPresetKey",
            defaults.activeParentPresetKey
        ),
        childProfiles: readLocalJson(
            "childProfiles",
            defaults.childProfiles
        ),
        inventory: readLocalJson(
            "inventory",
            defaults.inventory
        ),
        safetySettings: {
            ...defaults.safetySettings,
            ...readLocalJson(
                "safetySettings",
                {}
            ),
        },
        currentMoment: {
            ...defaults.currentMoment,
            ...readLocalJson("currentMoment", {}),
        },
        customParentPresets: readLocalJson(
            "customParentPresets",
            defaults.customParentPresets
        ),
        savedActivities: readLocalJson(
            "savedActivities",
            defaults.savedActivities
        ),
        activityHistory: readLocalJson(
            "activityHistory",
            defaults.activityHistory
        ),
        lastSuccessfulMoment: readLocalJson(
            "lastSuccessfulMoment",
            defaults.lastSuccessfulMoment
        ),
    };
}

export function clearFamilySettingsLocalStorage() {
    for (const key of FAMILY_SETTINGS_LOCAL_KEYS) {
        window.localStorage.removeItem(key);
    }
}

export function familySettingsPayloadFromState({
    activityMode,
    activeChildId,
    activeParentPresetKey,
    childProfiles,
    inventory,
    safetySettings,
    currentMoment,
    customParentPresets,
    lastSuccessfulMoment,
    uiTheme,
    kidDeviceMode,
    onboardingVersion = null,
    onboardingCompletedAt = null,
    onboardingSkippedAt = null,
}) {
    return {
        activityMode,
        activeChildId,
        activeParentPresetKey,
        childProfiles,
        inventory,
        safetySettings,
        currentMoment,
        customParentPresets,
        /*
         * Legacy JSON memory columns are retired; tables own favorites/history.
         */
        savedActivities: [],
        activityHistory: [],
        lastSuccessfulMoment:
            lastSuccessfulMoment &&
            typeof lastSuccessfulMoment === "object"
                ? lastSuccessfulMoment
                : null,
        uiTheme: uiTheme || "playroom",
        kidDeviceMode: kidDeviceMode === true,
        onboardingVersion:
            typeof onboardingVersion === "number" ? onboardingVersion : null,
        onboardingCompletedAt:
            typeof onboardingCompletedAt === "string"
                ? onboardingCompletedAt
                : null,
        onboardingSkippedAt:
            typeof onboardingSkippedAt === "string"
                ? onboardingSkippedAt
                : null,
    };
}

/*
 * Legacy JSON memory columns on family_settings are ignored.
 * Favorites and history live in dedicated tables (useFamilyMemory).
 * Keep this helper only for rare local fallback merges outside settings hydrate.
 */
export function mergeMemoryCollections(serverList, localList) {
    const server = Array.isArray(serverList) ? serverList : [];
    const local = Array.isArray(localList) ? localList : [];

    if (server.length > 0) {
        return server;
    }

    return local;
}

/*
 * Normalize a server or import document into values safe to apply to App state.
 * Does not apply legacy savedActivities / activityHistory JSON.
 */
export function normalizeFamilySettingsDocument(settings, localMemory = {}) {
    const defaults = buildDefaultFamilySettings();

    return {
        activityMode:
            settings?.activityMode === "family" ? "family" : "single-child",
        activeChildId:
            typeof settings?.activeChildId === "string"
                ? settings.activeChildId
                : "",
        activeParentPresetKey:
            typeof settings?.activeParentPresetKey === "string"
                ? settings.activeParentPresetKey
                : "",
        childProfiles: Array.isArray(settings?.childProfiles)
            ? settings.childProfiles
            : [],
        inventory: Array.isArray(settings?.inventory)
            ? settings.inventory
            : defaults.inventory,
        safetySettings: {
            ...defaults.safetySettings,
            ...(settings?.safetySettings || {}),
        },
        currentMoment: {
            ...defaults.currentMoment,
            ...(settings?.currentMoment || {}),
        },
        customParentPresets: Array.isArray(settings?.customParentPresets)
            ? settings.customParentPresets
            : [],
        savedActivities: [],
        activityHistory: [],
        lastSuccessfulMoment:
            settings?.lastSuccessfulMoment &&
            typeof settings.lastSuccessfulMoment === "object"
                ? settings.lastSuccessfulMoment
                : localMemory.lastSuccessfulMoment &&
                    typeof localMemory.lastSuccessfulMoment === "object"
                  ? localMemory.lastSuccessfulMoment
                  : null,
        uiTheme:
            typeof settings?.uiTheme === "string" && settings.uiTheme
                ? settings.uiTheme
                : "playroom",
        kidDeviceMode: settings?.kidDeviceMode === true,
        parentPinSet: settings?.parentPinSet === true,
        onboardingVersion:
            typeof settings?.onboardingVersion === "number"
                ? settings.onboardingVersion
                : null,
        onboardingCompletedAt:
            typeof settings?.onboardingCompletedAt === "string"
                ? settings.onboardingCompletedAt
                : null,
        onboardingSkippedAt:
            typeof settings?.onboardingSkippedAt === "string"
                ? settings.onboardingSkippedAt
                : null,
    };
}
