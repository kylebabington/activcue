// server/routes/familySettings.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { hashParentPin, verifyParentPin } from "../lib/parentPin.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";
import {
    familyDataRateLimiter,
    parentPinRateLimiter,
} from "../middleware/rateLimits.js";

const router = Router();

const VALID_ACTIVITY_MODES = new Set([
    "single-child",
    "family",
]);

const DEFAULT_SAFETY_SETTINGS = {
    screenFreeOnly: true,
    noFoodActivities: false,
    noWaterPlay: true,
    noSmallObjects: true,
    quietMode: false,
    maxActivityMinutes: 30,
    adultHelpAllowed: "optional",
};

const DEFAULT_ACTIVITY_PREFERENCES = {
    messTolerance: "a-little",
    setupEffort: "a-few-minutes",
    independencePreference: "mostly-independent",
    activityStylePreference: "mix",
    indoorOutdoorPreference: "either",
};

const DEFAULT_CURRENT_MOMENT = {
    parentActivity: "Cleaning the kitchen",
    availability: "helper-welcome",
    timeNeededMinutes: 20,
    space: "Living room",
    messLevel: "low",
    noiseLevel: "normal",
    supervisionLevel: "independent",
};

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function formatFamilySettings(row) {
    return {
        activityMode: row.activity_mode,
        activeChildId: row.active_child_id,
        playingChildIds: Array.isArray(row.playing_child_ids)
            ? row.playing_child_ids.filter(
                  (id) => typeof id === "string" && id.trim()
              )
            : [],
        activeParentPresetKey: row.active_parent_preset_key,
        childProfiles: row.child_profiles,
        inventory: row.inventory,
        safetySettings: row.safety_settings,
        activityPreferences:
            row.activity_preferences &&
            typeof row.activity_preferences === "object"
                ? row.activity_preferences
                : {},
        assumeHouseholdBasics: row.assume_household_basics !== false,
        currentMoment: row.current_moment,
        customParentPresets: row.custom_parent_presets,
        /*
         * Legacy JSON memory columns are retired — memory tables are source of truth.
         */
        savedActivities: [],
        activityHistory: [],
        lastSuccessfulMoment:
            row.last_successful_moment &&
            typeof row.last_successful_moment === "object"
                ? row.last_successful_moment
                : null,
        uiTheme:
            typeof row.ui_theme === "string" && row.ui_theme
                ? row.ui_theme
                : "playroom",
        kidDeviceMode: row.kid_device_mode === true,
        parentPinSet: Boolean(row.parent_pin_hash),
        onboardingVersion:
            typeof row.onboarding_version === "number"
                ? row.onboarding_version
                : null,
        onboardingCompletedAt: row.onboarding_completed_at || null,
        onboardingSkippedAt: row.onboarding_skipped_at || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/*
 * Light shape validation. Keep payloads close to the existing App.jsx
 * localStorage documents without enforcing every nested field.
 */
function validateSettingsPayload(body) {
    if (!isPlainObject(body)) {
        return {
            ok: false,
            error: "Settings body must be a JSON object.",
        };
    }

    const serialized = JSON.stringify(body);
    if (serialized.length > 250_000) {
        return {
            ok: false,
            error: "Settings payload is too large.",
            code: "SETTINGS_PAYLOAD_TOO_LARGE",
        };
    }

    const activityMode =
        typeof body.activityMode === "string"
            ? body.activityMode
            : "single-child";

    if (!VALID_ACTIVITY_MODES.has(activityMode)) {
        return {
            ok: false,
            error: 'activityMode must be "single-child" or "family".',
        };
    }

    if (
        body.activeChildId !== undefined &&
        typeof body.activeChildId !== "string"
    ) {
        return {
            ok: false,
            error: "activeChildId must be a string.",
        };
    }

    if (
        body.playingChildIds !== undefined &&
        !Array.isArray(body.playingChildIds)
    ) {
        return {
            ok: false,
            error: "playingChildIds must be an array.",
        };
    }

    if (
        Array.isArray(body.playingChildIds) &&
        body.playingChildIds.some(
            (id) => typeof id !== "string" || !id.trim()
        )
    ) {
        return {
            ok: false,
            error: "playingChildIds must contain non-empty strings.",
        };
    }

    if (
        body.activeParentPresetKey !== undefined &&
        typeof body.activeParentPresetKey !== "string"
    ) {
        return {
            ok: false,
            error: "activeParentPresetKey must be a string.",
        };
    }

    if (
        body.childProfiles !== undefined &&
        !Array.isArray(body.childProfiles)
    ) {
        return {
            ok: false,
            error: "childProfiles must be an array.",
        };
    }

    if (
        body.inventory !== undefined &&
        !Array.isArray(body.inventory)
    ) {
        return {
            ok: false,
            error: "inventory must be an array.",
        };
    }

    if (
        body.customParentPresets !== undefined &&
        !Array.isArray(body.customParentPresets)
    ) {
        return {
            ok: false,
            error: "customParentPresets must be an array.",
        };
    }

    if (
        body.safetySettings !== undefined &&
        !isPlainObject(body.safetySettings)
    ) {
        return {
            ok: false,
            error: "safetySettings must be an object.",
        };
    }

    if (
        body.currentMoment !== undefined &&
        !isPlainObject(body.currentMoment)
    ) {
        return {
            ok: false,
            error: "currentMoment must be an object.",
        };
    }

    if (
        body.lastSuccessfulMoment !== undefined &&
        body.lastSuccessfulMoment !== null &&
        !isPlainObject(body.lastSuccessfulMoment)
    ) {
        return {
            ok: false,
            error: "lastSuccessfulMoment must be an object or null.",
        };
    }

    if (
        body.uiTheme !== undefined &&
        typeof body.uiTheme !== "string"
    ) {
        return {
            ok: false,
            error: "uiTheme must be a string.",
        };
    }

    if (
        body.kidDeviceMode !== undefined &&
        typeof body.kidDeviceMode !== "boolean"
    ) {
        return {
            ok: false,
            error: "kidDeviceMode must be a boolean.",
        };
    }

    if (
        body.assumeHouseholdBasics !== undefined &&
        typeof body.assumeHouseholdBasics !== "boolean"
    ) {
        return {
            ok: false,
            error: "assumeHouseholdBasics must be a boolean.",
        };
    }

    if (
        body.activityPreferences !== undefined &&
        body.activityPreferences !== null &&
        !isPlainObject(body.activityPreferences)
    ) {
        return {
            ok: false,
            error: "activityPreferences must be an object.",
        };
    }

    if (
        body.onboardingVersion !== undefined &&
        body.onboardingVersion !== null &&
        typeof body.onboardingVersion !== "number"
    ) {
        return {
            ok: false,
            error: "onboardingVersion must be a number or null.",
        };
    }

    const childProfiles = Array.isArray(body.childProfiles)
        ? body.childProfiles
        : [];
    const profileIdSet = new Set(
        childProfiles
            .map((child) =>
                child && typeof child.id === "string" ? child.id.trim() : ""
            )
            .filter(Boolean)
    );
    let playingChildIds = Array.isArray(body.playingChildIds)
        ? body.playingChildIds
              .map((id) => String(id || "").trim())
              .filter((id) => id && profileIdSet.has(id))
        : [];

    if (
        playingChildIds.length === 0 &&
        typeof body.activeChildId === "string" &&
        body.activeChildId.trim() &&
        profileIdSet.has(body.activeChildId.trim())
    ) {
        playingChildIds = [body.activeChildId.trim()];
    }

    const derivedMode =
        playingChildIds.length >= 2 ? "family" : "single-child";
    const derivedActiveChildId =
        playingChildIds.length === 1 ? playingChildIds[0] : "";

    return {
        ok: true,
        settings: {
            activity_mode: derivedMode,
            active_child_id: derivedActiveChildId,
            playing_child_ids: playingChildIds,
            active_parent_preset_key:
                typeof body.activeParentPresetKey === "string"
                    ? body.activeParentPresetKey
                    : "",
            child_profiles: childProfiles,
            inventory: Array.isArray(body.inventory)
                ? body.inventory
                : [],
            safety_settings: isPlainObject(body.safetySettings)
                ? {
                      ...DEFAULT_SAFETY_SETTINGS,
                      ...body.safetySettings,
                  }
                : DEFAULT_SAFETY_SETTINGS,
            activity_preferences: isPlainObject(body.activityPreferences)
                ? {
                      ...DEFAULT_ACTIVITY_PREFERENCES,
                      ...body.activityPreferences,
                  }
                : DEFAULT_ACTIVITY_PREFERENCES,
            assume_household_basics: body.assumeHouseholdBasics !== false,
            current_moment: isPlainObject(body.currentMoment)
                ? {
                      ...DEFAULT_CURRENT_MOMENT,
                      ...body.currentMoment,
                  }
                : DEFAULT_CURRENT_MOMENT,
            custom_parent_presets: Array.isArray(
                body.customParentPresets
            )
                ? body.customParentPresets
                : [],
            /*
             * Stop writing legacy JSON memory columns — tables own favorites/history.
             */
            saved_activities: [],
            activity_history: [],
            last_successful_moment:
                body.lastSuccessfulMoment === null
                    ? null
                    : isPlainObject(body.lastSuccessfulMoment)
                      ? body.lastSuccessfulMoment
                      : null,
            ui_theme:
                typeof body.uiTheme === "string" && body.uiTheme.trim()
                    ? body.uiTheme.trim().slice(0, 64)
                    : "playroom",
            kid_device_mode: body.kidDeviceMode === true,
            onboarding_version:
                typeof body.onboardingVersion === "number"
                    ? body.onboardingVersion
                    : null,
            onboarding_completed_at:
                typeof body.onboardingCompletedAt === "string"
                    ? body.onboardingCompletedAt
                    : null,
            onboarding_skipped_at:
                typeof body.onboardingSkippedAt === "string"
                    ? body.onboardingSkippedAt
                    : null,
        },
    };
}

/*
 * GET /api/family-settings
 *
 * Returns exists:false when this user has never saved settings.
 */
router.get(
    "/family-settings",
    familyDataRateLimiter,
    requireAuthenticatedUser,
    ensureUserProfile,
    async (req, res) => {
        try {
            const supabase = getSupabaseAdminClient();

            const { data, error } = await supabase
                .from("family_settings")
                .select("*")
                .eq("user_id", req.auth.userId)
                .maybeSingle();

            if (error) {
                console.error(
                    "Could not load family settings:",
                    error
                );

                return res.status(500).json({
                    error: "Could not load family settings.",
                    code: "FAMILY_SETTINGS_LOAD_FAILED",
                });
            }

            if (!data) {
                return res.json({
                    exists: false,
                    settings: null,
                });
            }

            return res.json({
                exists: true,
                settings: formatFamilySettings(data),
            });
        } catch (error) {
            console.error(
                "Unexpected family settings load failure:",
                error
            );

            return res.status(500).json({
                error: "Could not load family settings.",
                code: "FAMILY_SETTINGS_LOAD_FAILED",
            });
        }
    }
);

/*
 * PUT /api/family-settings
 *
 * Upserts the full settings document for the authenticated user.
 */
router.put(
    "/family-settings",
    familyDataRateLimiter,
    requireAuthenticatedUser,
    ensureUserProfile,
    async (req, res) => {
        try {
            const validation = validateSettingsPayload(
                req.body
            );

            if (!validation.ok) {
                return res.status(400).json({
                    error: validation.error,
                    code: "FAMILY_SETTINGS_INVALID",
                });
            }

            const supabase = getSupabaseAdminClient();

            const { data, error } = await supabase
                .from("family_settings")
                .upsert(
                    {
                        user_id: req.auth.userId,
                        ...validation.settings,
                    },
                    {
                        onConflict: "user_id",
                    }
                )
                .select("*")
                .single();

            if (error) {
                console.error(
                    "Could not save family settings:",
                    error
                );

                return res.status(500).json({
                    error: "Could not save family settings.",
                    code: "FAMILY_SETTINGS_SAVE_FAILED",
                });
            }

            return res.json({
                exists: true,
                settings: formatFamilySettings(data),
            });
        } catch (error) {
            console.error(
                "Unexpected family settings save failure:",
                error
            );

            return res.status(500).json({
                error: "Could not save family settings.",
                code: "FAMILY_SETTINGS_SAVE_FAILED",
            });
        }
    }
);

/*
 * POST /api/family-settings/parent-pin
 * Body: { pin: "1234" } — stores a scrypt hash; never returns the PIN.
 */
router.post(
    "/family-settings/parent-pin",
    parentPinRateLimiter,
    requireAuthenticatedUser,
    ensureUserProfile,
    async (req, res) => {
        try {
            const pin = String(req.body?.pin || "").trim();
            if (pin.length < 4) {
                return res.status(400).json({
                    error: "PIN must be at least 4 digits.",
                    code: "INVALID_PARENT_PIN",
                });
            }

            const parentPinHash = hashParentPin(pin);
            const supabase = getSupabaseAdminClient();

            const { data: existing } = await supabase
                .from("family_settings")
                .select("user_id")
                .eq("user_id", req.auth.userId)
                .maybeSingle();

            if (!existing) {
                return res.status(404).json({
                    error: "Save family settings once before setting a PIN.",
                    code: "FAMILY_SETTINGS_MISSING",
                });
            }

            const { error } = await supabase
                .from("family_settings")
                .update({ parent_pin_hash: parentPinHash })
                .eq("user_id", req.auth.userId);

            if (error) {
                throw error;
            }

            return res.json({
                parentPinSet: true,
            });
        } catch (error) {
            console.error("Could not save parent PIN:", error);
            return res.status(500).json({
                error: "Could not save parent PIN.",
                code: "PARENT_PIN_SAVE_FAILED",
            });
        }
    }
);

/*
 * POST /api/family-settings/verify-parent-pin
 * Body: { pin: "1234" }
 */
router.post(
    "/family-settings/verify-parent-pin",
    parentPinRateLimiter,
    requireAuthenticatedUser,
    ensureUserProfile,
    async (req, res) => {
        try {
            const pin = String(req.body?.pin || "").trim();
            const supabase = getSupabaseAdminClient();

            const { data, error } = await supabase
                .from("family_settings")
                .select("parent_pin_hash")
                .eq("user_id", req.auth.userId)
                .maybeSingle();

            if (error) {
                throw error;
            }

            const ok = verifyParentPin(pin, data?.parent_pin_hash);
            if (!ok) {
                return res.status(403).json({
                    error: "That PIN is incorrect.",
                    code: "PARENT_PIN_INVALID",
                    unlocked: false,
                });
            }

            return res.json({ unlocked: true });
        } catch (error) {
            console.error("Could not verify parent PIN:", error);
            return res.status(500).json({
                error: "Could not verify parent PIN.",
                code: "PARENT_PIN_VERIFY_FAILED",
            });
        }
    }
);

export default router;
