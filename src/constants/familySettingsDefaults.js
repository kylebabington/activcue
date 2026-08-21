// src/constants/familySettingsDefaults.js

import { buildDefaultInventory } from "./inventoryPresets";
import {
    DEFAULT_ACTIVITY_PREFERENCES,
    normalizeActivityPreferences,
} from "./activityPreferences";

export const FAMILY_SETTINGS_LOCAL_KEYS = [
    "currentMoment",
    "customParentPresets",
    "activeParentPresetKey",
    "inventory",
    "activityMode",
    "childProfiles",
    "activeChildId",
    "playingChildIds",
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

export { DEFAULT_ACTIVITY_PREFERENCES };

/**
 * Derive activityMode + activeChildId from the selected playing set.
 * playingChildIds is authoritative; mode/active id follow from it.
 */
export function deriveActivityModeFromPlayingChildIds(playingChildIds = []) {
    const ids = (Array.isArray(playingChildIds) ? playingChildIds : [])
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean);

    if (ids.length >= 2) {
        return {
            playingChildIds: ids,
            activityMode: "family",
            activeChildId: "",
        };
    }

    return {
        playingChildIds: ids,
        activityMode: "single-child",
        activeChildId: ids[0] || "",
    };
}

/**
 * Restore saved playing ids, intersecting with known profiles.
 * Never expands family mode to "everyone" — only restore what was saved.
 */
export function resolvePlayingChildIds({
    playingChildIds,
    childProfiles = [],
    activityMode,
    activeChildId,
} = {}) {
    const profileIds = new Set(
        (Array.isArray(childProfiles) ? childProfiles : [])
            .map((child) => child?.id)
            .filter(Boolean)
    );

    const saved = (Array.isArray(playingChildIds) ? playingChildIds : [])
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter((id) => id && profileIds.has(id));

    if (saved.length > 0) {
        return saved;
    }

    // Legacy fallback for rows that predate playing_child_ids.
    if (
        typeof activeChildId === "string" &&
        activeChildId &&
        profileIds.has(activeChildId)
    ) {
        return [activeChildId];
    }

    if (profileIds.size === 1) {
        return [Array.from(profileIds)[0]];
    }

    // Do not select everyone when mode was "family" but ids were never saved.
    void activityMode;
    return [];
}

export function buildDefaultFamilySettings() {
    return {
        activityMode: "single-child",
        activeChildId: "",
        playingChildIds: [],
        activeParentPresetKey: "",
        childProfiles: [],
        inventory: buildDefaultInventory(),
        safetySettings: { ...DEFAULT_SAFETY_SETTINGS },
        activityPreferences: { ...DEFAULT_ACTIVITY_PREFERENCES },
        assumeHouseholdBasics: true,
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

    const childProfiles = readLocalJson(
        "childProfiles",
        defaults.childProfiles
    );
    const activeChildId = readLocalJson(
        "activeChildId",
        defaults.activeChildId
    );
    const playingChildIds = resolvePlayingChildIds({
        playingChildIds: readLocalJson("playingChildIds", []),
        childProfiles,
        activityMode,
        activeChildId,
    });
    const derived = deriveActivityModeFromPlayingChildIds(playingChildIds);

    return {
        activityMode: derived.activityMode,
        activeChildId: derived.activeChildId,
        playingChildIds: derived.playingChildIds,
        activeParentPresetKey: readLocalJson(
            "activeParentPresetKey",
            defaults.activeParentPresetKey
        ),
        childProfiles,
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
    playingChildIds,
    activeParentPresetKey,
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
}) {
    const resolvedPlaying = resolvePlayingChildIds({
        playingChildIds,
        childProfiles,
        activityMode,
        activeChildId,
    });
    const derived = deriveActivityModeFromPlayingChildIds(resolvedPlaying);

    return {
        activityMode: derived.activityMode,
        activeChildId: derived.activeChildId,
        playingChildIds: derived.playingChildIds,
        activeParentPresetKey,
        childProfiles,
        inventory,
        safetySettings,
        activityPreferences: normalizeActivityPreferences(activityPreferences),
        assumeHouseholdBasics: assumeHouseholdBasics !== false,
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
    const childProfiles = Array.isArray(settings?.childProfiles)
        ? settings.childProfiles
        : [];
    const playingChildIds = resolvePlayingChildIds({
        playingChildIds: settings?.playingChildIds,
        childProfiles,
        activityMode: settings?.activityMode,
        activeChildId: settings?.activeChildId,
    });
    const derived = deriveActivityModeFromPlayingChildIds(playingChildIds);

    return {
        activityMode: derived.activityMode,
        activeChildId: derived.activeChildId,
        playingChildIds: derived.playingChildIds,
        activeParentPresetKey:
            typeof settings?.activeParentPresetKey === "string"
                ? settings.activeParentPresetKey
                : "",
        childProfiles,
        inventory: Array.isArray(settings?.inventory)
            ? settings.inventory
            : defaults.inventory,
        safetySettings: {
            ...defaults.safetySettings,
            ...(settings?.safetySettings || {}),
        },
        activityPreferences: normalizeActivityPreferences(
            settings?.activityPreferences
        ),
        assumeHouseholdBasics: settings?.assumeHouseholdBasics !== false,
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
