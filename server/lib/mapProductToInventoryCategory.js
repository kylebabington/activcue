// server/lib/mapProductToInventoryCategory.js

const CATEGORY_RULES = [
  {
    category: "Building toys",
    keywords: [
      "lego",
      "duplo",
      "mega bloks",
      "building block",
      "building set",
      "construction toy",
      "magnetic tile",
      "magnatile",
      "keva",
      "kapla",
    ],
  },
  {
    category: "Art supplies",
    keywords: [
      "crayon",
      "marker",
      "paint",
      "watercolor",
      "colored pencil",
      "colouring",
      "coloring",
      "sketchbook",
      "clay",
      "play-doh",
      "play doh",
      "scissors",
      "glue stick",
      "stamp",
      "sticker",
      "craft",
    ],
  },
  {
    category: "Outdoor gear",
    keywords: [
      "bike",
      "scooter",
      "sidewalk chalk",
      "bubble",
      "sandbox",
      "water table",
      "frisbee",
      "ball",
      "jump rope",
      "outdoor",
      "wagon",
      "tricycle",
    ],
  },
  {
    category: "Pretend play",
    keywords: [
      "doll",
      "action figure",
      "dress up",
      "costume",
      "kitchen set",
      "play food",
      "toy kitchen",
      "doctor kit",
      "puppet",
      "plush",
      "stuffed animal",
      "figurine",
    ],
  },
  {
    category: "Books",
    keywords: [
      "book",
      "hardcover",
      "paperback",
      "board book",
      "picture book",
      "storybook",
      "isbn",
      "novel",
      "reader",
    ],
  },
  {
    category: "Board games",
    keywords: [
      "board game",
      "card game",
      "puzzle",
      "jigsaw",
      "memory game",
      "chess",
      "checkers",
      "domino",
      "tabletop",
    ],
  },
  {
    category: "STEM / experiments",
    keywords: [
      "science",
      "stem",
      "steam",
      "robot",
      "coding",
      "microscope",
      "experiment",
      "electronics",
      "circuit",
      "magnet",
      "chemistry",
    ],
  },
  {
    category: "Quiet activities",
    keywords: [
      "quiet",
      "sensory",
      "fidget",
      "coloring book",
      "activity book",
      "sticker book",
      "audiobook",
    ],
  },
  {
    category: "Household-safe items",
    keywords: [
      "blanket",
      "pillow",
      "cardboard",
      "tape",
      "measuring cup",
      "kitchen towel",
      "flash light",
      "flashlight",
    ],
  },
];

/**
 * Map a product title / brand / remote category string to an inventory category.
 * @param {{ title?: string, brand?: string, remoteCategory?: string }} input
 * @returns {string}
 */
export function mapProductToInventoryCategory({
  title = "",
  brand = "",
  remoteCategory = "",
} = {}) {
  const haystack = `${title} ${brand} ${remoteCategory}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category;
    }
  }

  return "Other";
}
