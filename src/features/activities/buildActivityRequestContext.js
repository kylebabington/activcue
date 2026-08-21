// src/features/activities/buildActivityRequestContext.js
// One immutable snapshot per recommendation. Downstream code must not re-derive participants.

import { getAgeBand, resolveChildAge } from "../../utils/childAge";
import {
  normalizeChildAvoids,
  normalizeChildIndependenceLevel,
} from "../../constants/activityPreferences";
import { deriveActivityModeFromPlayingChildIds } from "../../constants/familySettingsDefaults";

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function newRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function snapshotChild(profile) {
  const resolved = resolveChildAge(profile);
  const ageYears = Number.isFinite(resolved.ageYears) ? resolved.ageYears : null;
  const interests = asStringArray(profile?.interests);
  const avoids = normalizeChildAvoids(profile?.avoids || profile?.needs);

  return {
    id: String(profile?.id || "").trim(),
    name: typeof profile?.name === "string" ? profile.name.trim() : "",
    ageYears,
    ageBand: ageYears != null ? getAgeBand(ageYears) : null,
    interests,
    avoids,
    independenceLevel: normalizeChildIndependenceLevel(
      profile?.independenceLevel
    ),
  };
}

/**
 * Stricter restriction wins. Moment usually overrides preferences;
 * safety flags are never loosened by preferences.
 */
export function mergeSafetyAndMomentConstraints({
  safetySettings = {},
  currentMoment = {},
  activityPreferences = {},
} = {}) {
  const momentMinutes = Number(currentMoment.timeNeededMinutes);
  const safetyMinutes = Number(safetySettings.maxActivityMinutes);
  const maxActivityMinutes = Math.min(
    Number.isFinite(momentMinutes) && momentMinutes > 0 ? momentMinutes : 30,
    Number.isFinite(safetyMinutes) && safetyMinutes > 0 ? safetyMinutes : 30
  );

  const quiet =
    safetySettings.quietMode === true ||
    currentMoment.noiseLevel === "quiet";

  const messPreference = activityPreferences.messTolerance;
  const momentMess = currentMoment.messLevel || "low";
  // Moment ceiling wins: low mess always wins over "fine with mess".
  const messLevel =
    momentMess === "none" || momentMess === "low"
      ? momentMess
      : messPreference === "keep-it-tidy"
        ? "low"
        : momentMess;

  const preferenceIndependence =
    activityPreferences.independencePreference || "mostly-independent";
  const momentSupervision = currentMoment.supervisionLevel || "nearby";
  const adultHelpAllowed =
    momentSupervision === "independent" ||
    safetySettings.adultHelpAllowed === "none"
      ? "independent"
      : momentSupervision === "hands-on" ||
          safetySettings.adultHelpAllowed === "required"
        ? "required"
        : safetySettings.adultHelpAllowed === "optional" ||
            preferenceIndependence === "mostly-independent"
          ? "optional"
          : "optional";

  return {
    screenFreeOnly: safetySettings.screenFreeOnly !== false,
    noFoodActivities: safetySettings.noFoodActivities === true,
    noWaterPlay: safetySettings.noWaterPlay === true,
    noSmallObjects: safetySettings.noSmallObjects === true,
    quietMode: quiet,
    maxActivityMinutes,
    adultHelpAllowed,
    messLevel,
    noiseLevel: quiet ? "quiet" : currentMoment.noiseLevel || "normal",
    supervisionLevel:
      adultHelpAllowed === "independent"
        ? "independent"
        : adultHelpAllowed === "required"
          ? "hands-on"
          : momentSupervision,
  };
}

/**
 * Build an immutable recommendation request snapshot from live app state.
 */
export function buildActivityRequestContext({
  playingChildIds = [],
  childProfiles = [],
  selectedChildProfiles = [],
  activeChildProfile = null,
  activityMode,
  activeChildId,
  currentMoment = {},
  safetySettings = {},
  activityPreferences = {},
  inventory = [],
  kidActivityStyle = "simple",
  kidEnergyLevel = "neutral",
  generationIntent = null,
  requestId = null,
} = {}) {
  const profileById = new Map(
    (Array.isArray(childProfiles) ? childProfiles : [])
      .filter((child) => child?.id)
      .map((child) => [String(child.id), child])
  );

  let participantIds = (Array.isArray(playingChildIds) ? playingChildIds : [])
    .map((id) => String(id || "").trim())
    .filter((id) => id && profileById.has(id));

  if (participantIds.length === 0 && Array.isArray(selectedChildProfiles)) {
    participantIds = selectedChildProfiles
      .map((child) => String(child?.id || "").trim())
      .filter((id) => id && profileById.has(id));
  }

  if (
    participantIds.length === 0 &&
    activeChildProfile?.id &&
    profileById.has(String(activeChildProfile.id))
  ) {
    participantIds = [String(activeChildProfile.id)];
  }

  if (
    participantIds.length === 0 &&
    typeof activeChildId === "string" &&
    activeChildId &&
    profileById.has(activeChildId)
  ) {
    participantIds = [activeChildId];
  }

  const derived = deriveActivityModeFromPlayingChildIds(participantIds);
  const children = participantIds.map((id) => snapshotChild(profileById.get(id)));

  const styleFromIntent =
    generationIntent?.activityStyle === "imaginative"
      ? "imaginative"
      : generationIntent?.activityStyle === "simple"
        ? "simple"
        : null;
  const energyFromIntent =
    typeof generationIntent?.energyLevel === "string" &&
    generationIntent.energyLevel
      ? generationIntent.energyLevel
      : null;

  const merged = mergeSafetyAndMomentConstraints({
    safetySettings,
    currentMoment,
    activityPreferences,
  });

  const moment = {
    parentActivity: currentMoment.parentActivity || "",
    availability: currentMoment.availability || "helper-welcome",
    timeNeededMinutes: merged.maxActivityMinutes,
    space: currentMoment.space || "",
    messLevel: merged.messLevel,
    noiseLevel: merged.noiseLevel,
    supervisionLevel: merged.supervisionLevel,
  };

  return Object.freeze({
    requestId: requestId || newRequestId(),
    participants: Object.freeze({
      mode: derived.activityMode,
      children: Object.freeze(children.map((child) => Object.freeze(child))),
      participantCount: children.length,
      ages: children
        .map((child) => child.ageYears)
        .filter((age) => Number.isFinite(age)),
    }),
    activity: Object.freeze({
      style:
        styleFromIntent ||
        (kidActivityStyle === "imaginative" ? "imaginative" : "simple"),
      energyLevel: energyFromIntent || kidEnergyLevel || "neutral",
    }),
    moment: Object.freeze(moment),
    safety: Object.freeze({
      screenFreeOnly: merged.screenFreeOnly,
      noFoodActivities: merged.noFoodActivities,
      noWaterPlay: merged.noWaterPlay,
      noSmallObjects: merged.noSmallObjects,
      maxActivityMinutes: merged.maxActivityMinutes,
      adultHelpAllowed: merged.adultHelpAllowed,
      quietMode: merged.quietMode,
    }),
    inventory: Object.freeze(
      (Array.isArray(inventory) ? inventory : []).map((item) =>
        item && typeof item === "object" ? Object.freeze({ ...item }) : item
      )
    ),
    preferences: Object.freeze({
      ...(activityPreferences && typeof activityPreferences === "object"
        ? activityPreferences
        : {}),
      indoorOutdoorPreference:
        activityPreferences?.indoorOutdoorPreference || "either",
    }),
    // Client-declared mode kept for telemetry only; participants.mode is authoritative.
    declaredActivityMode: activityMode || derived.activityMode,
  });
}

/**
 * Flat dual-write fields for APIs that still expect the legacy body shape.
 */
export function requestContextToLegacyPayload(requestContext) {
  const children = requestContext?.participants?.children || [];
  const active =
    requestContext?.participants?.mode === "single-child" ? children[0] : null;

  return {
    requestContext,
    requestId: requestContext?.requestId,
    activityMode: requestContext?.participants?.mode,
    activityStyle: requestContext?.activity?.style,
    kidMood: requestContext?.activity?.energyLevel,
    selectedChildProfiles: children,
    activeChildProfile: active,
    childIds: children.map((child) => child.id).filter(Boolean),
    currentMoment: requestContext?.moment,
    messLevel: requestContext?.moment?.messLevel,
    activitySpace: requestContext?.moment?.space,
    parentActivity: requestContext?.moment?.parentActivity,
    parentAvailability: requestContext?.moment?.availability,
    inventory: requestContext?.inventory || [],
    safetySettings: {
      ...(requestContext?.safety || {}),
      quietMode: requestContext?.safety?.quietMode === true,
      maxActivityMinutes: requestContext?.safety?.maxActivityMinutes,
    },
    activityPreferences: requestContext?.preferences || {},
    childAgeRange:
      active?.ageYears != null
        ? String(active.ageYears)
        : children.length > 0
          ? children.map((c) => c.ageYears).filter(Number.isFinite).join(",")
          : undefined,
  };
}
