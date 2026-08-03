// src/utils/activityTraits.js

/*
 * Activity category / trait intelligence.
 * Prefer AI-provided categories + traits; infer only for legacy activities.
 */

import { normalizeTextValue } from "./activityScoring";

export const ACTIVITY_CATEGORIES = [
  "building",
  "creative",
  "movement",
  "pretend",
  "puzzle",
  "sensory",
  "nature",
  "science",
  "music",
  "reading",
  "social-game",
  "helping",
];

const CATEGORY_SET = new Set(ACTIVITY_CATEGORIES);

const SETUP_EFFORT_VALUES = ["very-low", "low", "medium", "high"];
const STRUCTURE_VALUES = ["guided", "open-ended"];
const SOCIAL_MODE_VALUES = ["solo", "cooperative", "competitive", "flexible"];
const CREATIVITY_VALUES = ["low", "medium", "high"];
const MOVEMENT_TRAIT_VALUES = ["low", "medium", "high"];

const LEGACY_CATEGORY_MAP = {
  drawing: "creative",
  craft: "creative",
  writing: "creative",
  construction: "building",
  outdoor: "nature",
  sorting: "puzzle",
  collection: "helping",
};

const CATEGORY_KEYWORDS = {
  nature: [
    "outdoor",
    "outside",
    "backyard",
    "yard",
    "nature",
    "garden",
    "park",
    "scavenger",
  ],
  movement: [
    "dance",
    "jump",
    "yoga",
    "stretch",
    "obstacle",
    "race",
    "movement",
    "exercise",
    "hop",
    "skip",
  ],
  building: [
    "lego",
    "blocks",
    "build",
    "tower",
    "stack",
    "magnetiles",
    "magna-tiles",
    "duplo",
    "brick",
    "fort",
    "cardboard",
  ],
  creative: [
    "draw",
    "drawing",
    "color",
    "crayon",
    "marker",
    "paint",
    "craft",
    "glue",
    "collage",
    "write",
    "journal",
  ],
  reading: ["read", "reading", "book", "storytime", "picture book"],
  pretend: [
    "pretend",
    "imaginary",
    "role play",
    "role-play",
    "dress up",
    "puppet",
    "tea party",
    "superhero",
  ],
  puzzle: [
    "puzzle",
    "jigsaw",
    "maze",
    "riddle",
    "sort",
    "sorting",
    "match",
    "pattern",
  ],
  sensory: [
    "sensory",
    "playdough",
    "play-dough",
    "slime",
    "kinetic sand",
    "texture",
  ],
  science: ["science", "experiment", "magnet", " magnifying", "observe"],
  music: ["music", "sing", "song", "drum", "instrument", "rhythm"],
  "social-game": [
    "board game",
    "card game",
    "together",
    "family game",
    "cooperative",
  ],
  helping: ["help", "chore", "tidy", "clean up", "set the table", "organize"],
};

const CATEGORY_PRIORITY = [
  "nature",
  "movement",
  "building",
  "sensory",
  "creative",
  "science",
  "music",
  "reading",
  "pretend",
  "puzzle",
  "social-game",
  "helping",
];

function pickEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function buildSearchText(activity) {
  const uses = Array.isArray(activity?.uses) ? activity.uses : [];

  return [
    activity?.title,
    activity?.summary,
    activity?.theme,
    activity?.mission,
    ...uses,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function mapLegacyCategory(category) {
  if (!category) {
    return null;
  }
  if (CATEGORY_SET.has(category)) {
    return category;
  }
  return LEGACY_CATEGORY_MAP[category] || null;
}

function inferCategory(searchText) {
  for (const category of CATEGORY_PRIORITY) {
    const keywords = CATEGORY_KEYWORDS[category] || [];
    if (keywords.some((keyword) => searchText.includes(keyword))) {
      return category;
    }
  }

  return "building";
}

function normalizeProvidedCategories(categories) {
  if (!Array.isArray(categories)) {
    return [];
  }

  const unique = [];
  for (const raw of categories) {
    const mapped = mapLegacyCategory(
      typeof raw === "string" ? raw.trim().toLowerCase() : ""
    );
    if (mapped && !unique.includes(mapped)) {
      unique.push(mapped);
    }
  }
  return unique;
}

function normalizeProvidedTraits(traits) {
  if (!traits || typeof traits !== "object" || Array.isArray(traits)) {
    return null;
  }

  const hasAny =
    traits.setupEffort ||
    traits.structure ||
    traits.socialMode ||
    traits.creativity ||
    traits.movement;

  if (!hasAny) {
    return null;
  }

  // Map legacy interactionStyle → structure when present
  const structure =
    traits.structure ||
    (traits.interactionStyle === "structured" ||
    traits.interactionStyle === "guided"
      ? "guided"
      : traits.interactionStyle === "open-ended"
        ? "open-ended"
        : null);

  const socialMode =
    traits.socialMode === "parallel" ? "flexible" : traits.socialMode;

  const movement =
    traits.movement ||
    (traits.physicality === "high"
      ? "high"
      : traits.physicality === "medium"
        ? "medium"
        : traits.physicality === "low"
          ? "low"
          : null);

  return {
    setupEffort: pickEnum(traits.setupEffort, SETUP_EFFORT_VALUES, "medium"),
    structure: pickEnum(structure, STRUCTURE_VALUES, "open-ended"),
    socialMode: pickEnum(socialMode, SOCIAL_MODE_VALUES, "flexible"),
    creativity: pickEnum(traits.creativity, CREATIVITY_VALUES, "medium"),
    movement: pickEnum(movement, MOVEMENT_TRAIT_VALUES, "low"),
  };
}

function inferSetupEffort(category, mess, usesCount) {
  if (
    category === "creative" ||
    category === "sensory" ||
    mess === "high" ||
    usesCount >= 4
  ) {
    return "high";
  }

  if (
    category === "building" ||
    category === "nature" ||
    mess === "medium" ||
    usesCount >= 2
  ) {
    return "medium";
  }

  if (usesCount <= 1 && mess === "low") {
    return "very-low";
  }

  return "low";
}

function inferStructure(category, searchText) {
  if (
    searchText.includes("open-ended") ||
    searchText.includes("free build") ||
    searchText.includes("free play") ||
    category === "building" ||
    category === "pretend" ||
    category === "sensory"
  ) {
    return "open-ended";
  }

  if (
    category === "puzzle" ||
    category === "reading" ||
    searchText.includes("step-by-step") ||
    searchText.includes("instructions")
  ) {
    return "guided";
  }

  return "open-ended";
}

function inferSocialMode(category, searchText) {
  if (
    searchText.includes("competitive") ||
    searchText.includes("race") ||
    searchText.includes("vs")
  ) {
    return "competitive";
  }

  if (
    searchText.includes("together") ||
    searchText.includes("family") ||
    searchText.includes("cooperative") ||
    searchText.includes("team") ||
    category === "social-game"
  ) {
    return "cooperative";
  }

  if (category === "movement" || category === "nature" || category === "pretend") {
    return "flexible";
  }

  return "solo";
}

function inferCreativity(category) {
  if (
    category === "creative" ||
    category === "pretend" ||
    category === "music"
  ) {
    return "high";
  }

  if (category === "building" || category === "science") {
    return "medium";
  }

  return "low";
}

function inferMovement(category, energy) {
  if (category === "movement" || category === "nature" || energy === "high") {
    return "high";
  }

  if (
    category === "building" ||
    category === "pretend" ||
    category === "helping" ||
    energy === "medium"
  ) {
    return "medium";
  }

  return "low";
}

/*
 * Resolve a stable trait profile for ranking and preference matching.
 * Prefers stored AI fields; falls back to keyword inference for legacy data.
 */
export function inferActivityTraits(activity) {
  const providedCategories = normalizeProvidedCategories(activity?.categories);
  const providedTraits = normalizeProvidedTraits(activity?.traits);

  const searchText = buildSearchText(activity);
  const energy = normalizeTextValue(activity?.energy) || "medium";
  const mess = normalizeTextValue(activity?.mess) || "low";
  const usesCount = Array.isArray(activity?.uses) ? activity.uses.length : 0;

  const category =
    providedCategories[0] ||
    mapLegacyCategory(activity?.category) ||
    inferCategory(searchText);

  const categories =
    providedCategories.length > 0 ? providedCategories : [category];

  const traits = providedTraits || {
    setupEffort: inferSetupEffort(category, mess, usesCount),
    structure: inferStructure(category, searchText),
    socialMode: inferSocialMode(category, searchText),
    creativity: inferCreativity(category),
    movement: inferMovement(category, energy),
  };

  return {
    category,
    categories,
    ...traits,
    // Back-compat aliases used by older Fit Score paths
    interactionStyle: traits.structure,
    physicality: traits.movement,
    cleanupEffort:
      mess === "high" || category === "sensory" || category === "creative"
        ? "high"
        : mess === "medium"
          ? "medium"
          : "low",
    cognitiveLoad:
      category === "puzzle" || category === "science" ? "high" : "medium",
  };
}

export function traitsSimilarityScore(traitsA, traitsB) {
  if (!traitsA || !traitsB) {
    return 0;
  }

  let score = 0;

  const catsA = Array.isArray(traitsA.categories)
    ? traitsA.categories
    : traitsA.category
      ? [traitsA.category]
      : [];
  const catsB = Array.isArray(traitsB.categories)
    ? traitsB.categories
    : traitsB.category
      ? [traitsB.category]
      : [];

  if (catsA.some((c) => catsB.includes(c))) {
    score += 4;
  } else if (traitsA.category && traitsA.category === traitsB.category) {
    score += 4;
  }

  if (traitsA.structure && traitsA.structure === traitsB.structure) {
    score += 2;
  } else if (
    traitsA.interactionStyle &&
    traitsA.interactionStyle === traitsB.interactionStyle
  ) {
    score += 2;
  }

  if (traitsA.creativity && traitsA.creativity === traitsB.creativity) {
    score += 1;
  }

  if (traitsA.movement && traitsA.movement === traitsB.movement) {
    score += 1;
  } else if (traitsA.physicality && traitsA.physicality === traitsB.physicality) {
    score += 1;
  }

  if (traitsA.socialMode && traitsA.socialMode === traitsB.socialMode) {
    score += 1;
  }

  if (traitsA.setupEffort && traitsA.setupEffort === traitsB.setupEffort) {
    score += 1;
  }

  return score;
}

export function activityTraitsMatch(activityA, activityB, { minScore = 4 } = {}) {
  return (
    traitsSimilarityScore(
      inferActivityTraits(activityA),
      inferActivityTraits(activityB)
    ) >= minScore
  );
}

export function activitySimilarity(activityA, activityB) {
  const maxScore = 10;
  const raw = traitsSimilarityScore(
    inferActivityTraits(activityA),
    inferActivityTraits(activityB)
  );
  return Math.min(1, Math.max(0, raw / maxScore));
}
