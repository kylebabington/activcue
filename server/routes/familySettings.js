// server/routes/familySettings.js

import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";
import { ensureUserProfile } from "../middleware/ensureUserProfile.js";

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
        activeParentPresetKey: row.active_parent_preset_key,
        childProfiles: row.child_profiles,
        inventory: row.inventory,
        safetySettings: row.safety_settings,
        currentMoment: row.current_moment,
        customParentPresets: row.custom_parent_presets,
        savedActivities: Array.isArray(row.saved_activities)
            ? row.saved_activities
            : [],
        activityHistory: Array.isArray(row.activity_history)
            ? row.activity_history
            : [],
        lastSuccessfulMoment:
            row.last_successful_moment &&
            typeof row.last_successful_moment === "object"
                ? row.last_successful_moment
                : null,
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
        body.savedActivities !== undefined &&
        !Array.isArray(body.savedActivities)
    ) {
        return {
            ok: false,
            error: "savedActivities must be an array.",
        };
    }

    if (
        body.activityHistory !== undefined &&
        !Array.isArray(body.activityHistory)
    ) {
        return {
            ok: false,
            error: "activityHistory must be an array.",
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

    return {
        ok: true,
        settings: {
            activity_mode: activityMode,
            active_child_id:
                typeof body.activeChildId === "string"
                    ? body.activeChildId
                    : "",
            active_parent_preset_key:
                typeof body.activeParentPresetKey === "string"
                    ? body.activeParentPresetKey
                    : "",
            child_profiles: Array.isArray(body.childProfiles)
                ? body.childProfiles
                : [],
            inventory: Array.isArray(body.inventory)
                ? body.inventory
                : [],
            safety_settings: isPlainObject(body.safetySettings)
                ? {
                      ...DEFAULT_SAFETY_SETTINGS,
                      ...body.safetySettings,
                  }
                : DEFAULT_SAFETY_SETTINGS,
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
            saved_activities: Array.isArray(body.savedActivities)
                ? body.savedActivities
                : [],
            activity_history: Array.isArray(body.activityHistory)
                ? body.activityHistory
                : [],
            last_successful_moment:
                body.lastSuccessfulMoment === null
                    ? null
                    : isPlainObject(body.lastSuccessfulMoment)
                      ? body.lastSuccessfulMoment
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

export default router;
