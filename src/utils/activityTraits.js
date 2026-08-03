// src/utils/activityTraits.js

/*
 * Deterministic activity-category intelligence.
 * Infers stable traits from title/summary/uses/energy/mess so Fit Score can
 * learn "open-ended building" rather than exact title strings.
 */

import { normalizeTextValue } from "./activityScoring";

export const ACTIVITY_CATEGORIES = [
  "building",
  "drawing",
  "reading",
  "pretend",
  "sorting",
  "puzzle",
  "movement",
  "outdoor",
  "craft",
  "sensory",
  "collection",
  "writing",
  "construction",
];

const CATEGORY_KEYWORDS = {
  outdoor: [
    "outdoor",
    "outside",
    "backyard",
    "yard",
    "sidewalk",
    "nature walk",
    "scavenger",
    "park",
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
    "gross motor",
    "hop",
    "skip",
  ],
  construction: [
    "fort",
    "cardboard",
    "tape fort",
    "build a house",
    "construction",
    "hammer",
    "wood",
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
  ],
  drawing: [
    "draw",
    "drawing",
    "color",
    "coloring",
    "crayon",
    "marker",
    "sketch",
    "doodle",
    "paint",
  ],
  writing: [
    "write",
    "writing",
    "journal",
    "letter",
    "story write",
    "handwriting",
    "pencil",
  ],
  reading: [
    "read",
    "reading",
    "book",
    "storytime",
    "story time",
    "library",
    "picture book",
  ],
  pretend: [
    "pretend",
    "imaginary",
    "role play",
    "role-play",
    "dress up",
    "dress-up",
    "puppet",
    "tea party",
    "restaurant",
    "doctor",
    "superhero",
  ],
  sorting: [
    "sort",
    "sorting",
    "match",
    "matching",
    "categor",
    "organize",
    "count",
  ],
  puzzle: [
    "puzzle",
    "jigsaw",
    "maze",
    "riddle",
    "brain teaser",
    "pattern",
  ],
  craft: [
    "craft",
    "glue",
    "scissors",
    "collage",
    "bead",
    "sew",
    "origami",
    "paper craft",
    "cut and paste",
  ],
  sensory: [
    "sensory",
    "playdough",
    "play-dough",
    "slime",
    "kinetic sand",
    "water play",
    "bin",
    "texture",
  ],
  collection: [
    "collect",
    "collection",
    "treasure hunt",
    "find and gather",
    "gather",
    "sticker book",
  ],
};

const CATEGORY_PRIORITY = [
  "outdoor",
  "movement",
  "construction",
  "building",
  "sensory",
  "craft",
  "drawing",
  "writing",
  "reading",
  "pretend",
  "puzzle",
  "sorting",
  "collection",
];

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

function inferCategory(searchText) {
  for (const category of CATEGORY_PRIORITY) {
    const keywords = CATEGORY_KEYWORDS[category] || [];
    if (keywords.some((keyword) => searchText.includes(keyword))) {
      return category;
    }
  }

  return "building";
}

function inferInteractionStyle(category, searchText) {
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
    category === "sorting" ||
    searchText.includes("step-by-step") ||
    searchText.includes("instructions")
  ) {
    return "structured";
  }

  if (category === "reading" || category === "writing") {
    return "guided";
  }

  return "exploratory";
}

function inferPhysicality(category, energy) {
  if (category === "movement" || category === "outdoor") {
    return "high";
  }

  if (energy === "high") {
    return "high";
  }

  if (
    category === "building" ||
    category === "construction" ||
    category === "pretend" ||
    energy === "medium"
  ) {
    return "medium";
  }

  return "low";
}

function inferCognitiveLoad(category, searchText) {
  if (
    category === "puzzle" ||
    category === "writing" ||
    searchText.includes("challenge") ||
    searchText.includes("logic")
  ) {
    return "high";
  }

  if (
    category === "reading" ||
    category === "sorting" ||
    category === "construction" ||
    category === "craft"
  ) {
    return "medium";
  }

  return "low";
}

function inferSetupEffort(category, mess, usesCount) {
  if (
    category === "craft" ||
    category === "sensory" ||
    category === "construction" ||
    mess === "high" ||
    usesCount >= 4
  ) {
    return "high";
  }

  if (
    category === "building" ||
    category === "outdoor" ||
    mess === "medium" ||
    usesCount >= 2
  ) {
    return "medium";
  }

  return "low";
}

function inferCleanupEffort(category, mess) {
  if (mess === "high" || category === "sensory" || category === "craft") {
    return "high";
  }

  if (
    mess === "medium" ||
    category === "building" ||
    category === "construction" ||
    category === "drawing"
  ) {
    return "medium";
  }

  return "low";
}

function inferSocialMode(category, searchText) {
  if (
    searchText.includes("together") ||
    searchText.includes("family") ||
    searchText.includes("cooperative") ||
    searchText.includes("team")
  ) {
    return "cooperative";
  }

  if (
    category === "movement" ||
    category === "outdoor" ||
    category === "pretend" ||
    searchText.includes("parallel")
  ) {
    return "parallel";
  }

  return "solo";
}

/*
 * Infer a stable trait profile for ranking and preference matching.
 */
export function inferActivityTraits(activity) {
  const searchText = buildSearchText(activity);
  const energy = normalizeTextValue(activity?.energy) || "medium";
  const mess = normalizeTextValue(activity?.mess) || "low";
  const usesCount = Array.isArray(activity?.uses) ? activity.uses.length : 0;
  const category = inferCategory(searchText);

  return {
    category,
    interactionStyle: inferInteractionStyle(category, searchText),
    physicality: inferPhysicality(category, energy),
    cognitiveLoad: inferCognitiveLoad(category, searchText),
    setupEffort: inferSetupEffort(category, mess, usesCount),
    cleanupEffort: inferCleanupEffort(category, mess),
    socialMode: inferSocialMode(category, searchText),
  };
}

export function traitsSimilarityScore(traitsA, traitsB) {
  if (!traitsA || !traitsB) {
    return 0;
  }

  let score = 0;

  if (traitsA.category && traitsA.category === traitsB.category) {
    score += 4;
  }

  if (
    traitsA.interactionStyle &&
    traitsA.interactionStyle === traitsB.interactionStyle
  ) {
    score += 2;
  }

  if (traitsA.physicality && traitsA.physicality === traitsB.physicality) {
    score += 1;
  }

  if (
    traitsA.cognitiveLoad &&
    traitsA.cognitiveLoad === traitsB.cognitiveLoad
  ) {
    score += 1;
  }

  if (traitsA.socialMode && traitsA.socialMode === traitsB.socialMode) {
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
