/**
 * Shared helpers for preset ageFit / traits metadata.
 */

export function maturityFromAges(minAge, maxAge) {
  if (maxAge <= 6) return "young-child";
  if (minAge >= 13) return "teen";
  if (minAge >= 10) return "tween";
  if (minAge <= 6 && maxAge >= 12) return "mixed-age";
  return "child";
}

export function independenceFromAdultHelp(adultHelp) {
  if (adultHelp === "required") return "adult-led";
  if (adultHelp === "optional") return "some-help";
  if (adultHelp === "nearby") return "mostly-independent";
  return "independent";
}

export function buildAgeFit({
  minAge,
  maxAge,
  adultHelp = "none",
  ageFitReason,
}) {
  const mid = Math.round((minAge + maxAge) / 2);
  const targetAges = [...new Set([minAge, mid, maxAge])].filter(
    (age) => age >= minAge && age <= maxAge
  );
  return {
    minAge,
    maxAge,
    targetAges,
    maturityLevel: maturityFromAges(minAge, maxAge),
    independenceLevel: independenceFromAdultHelp(adultHelp),
    ageFitReason:
      ageFitReason ||
      `Fits ages ${minAge}–${maxAge} with the independence and complexity this activity needs.`,
  };
}

export function defaultTraits({
  energy = "medium",
  setupEffort = "low",
  structure = "guided",
  socialMode = "solo",
  creativity = "medium",
  movement = "low",
} = {}) {
  const movementFromEnergy =
    energy === "high" ? "high" : energy === "low" || energy === "calm" ? "low" : "medium";
  return {
    setupEffort,
    structure,
    socialMode,
    creativity,
    movement: movement || movementFromEnergy,
  };
}

function normalizeTraitStructure(value) {
  if (value === "open" || value === "openended" || value === "open_ended") {
    return "open-ended";
  }
  if (value === "guided" || value === "open-ended") {
    return value;
  }
  return "guided";
}

const ENRICH_STRIP_KEYS = [
  "minAge",
  "maxAge",
  "setupEffort",
  "structure",
  "socialMode",
  "creativity",
  "movement",
  "ageFitReason",
];

export function enrichActivity(activity) {
  const minAge = Number(activity.minAge ?? activity.ageFit?.minAge ?? 5);
  const maxAge = Number(activity.maxAge ?? activity.ageFit?.maxAge ?? 12);
  const adultHelp = activity.adultHelp || "none";
  const categories = Array.isArray(activity.categories)
    ? activity.categories
    : ["creative"];
  const rawTraits =
    activity.traits && typeof activity.traits === "object"
      ? activity.traits
      : defaultTraits({
          energy: activity.energy,
          setupEffort: activity.setupEffort,
          structure: activity.structure,
          socialMode: activity.socialMode,
          creativity: activity.creativity,
          movement: activity.movement,
        });
  const traits = {
    ...rawTraits,
    structure: normalizeTraitStructure(rawTraits.structure),
  };

  const ageFit =
    activity.ageFit && typeof activity.ageFit === "object"
      ? {
          ...buildAgeFit({
            minAge,
            maxAge,
            adultHelp,
            ageFitReason: activity.ageFit.ageFitReason,
          }),
          ...activity.ageFit,
          minAge: Number(activity.ageFit.minAge) || minAge,
          maxAge: Number(activity.ageFit.maxAge) || maxAge,
        }
      : buildAgeFit({
          minAge,
          maxAge,
          adultHelp,
          ageFitReason: activity.ageFitReason,
        });

  const rest = { ...activity };
  for (const key of ENRICH_STRIP_KEYS) {
    delete rest[key];
  }

  return {
    ...rest,
    adultHelp,
    categories,
    traits,
    ageFit,
  };
}
