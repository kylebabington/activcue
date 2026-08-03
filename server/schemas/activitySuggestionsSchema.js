import {
  ACTIVITY_CATEGORIES,
  CREATIVITY_VALUES,
  MOVEMENT_TRAIT_VALUES,
  SETUP_EFFORT_VALUES,
  SOCIAL_MODE_VALUES,
  STRUCTURE_VALUES,
} from "./activityTaxonomy.js";

/** Deterministic visual themes for imaginative cards (no AI artwork). */
export const VISUAL_THEMES = [
  "space",
  "jungle",
  "detective",
  "animals",
  "fantasy",
  "building",
  "science",
  "art",
  "expedition",
  "neighborhood",
  "rescue",
  "mystery",
];

export const STARTER_IDEA_KINDS = [
  "imagination",
  "choice",
  "dialogue",
  "drawing",
  "building",
];

const roleGuideSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    goal: { type: "string" },
    firstAction: { type: "string" },
  },
  required: ["name", "description", "goal", "firstAction"],
  additionalProperties: false,
};

const starterIdeaSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    example: { type: "string" },
    kind: {
      type: "string",
      enum: STARTER_IDEA_KINDS,
    },
  },
  required: ["title", "example", "kind"],
  additionalProperties: false,
};

const stepRoleInstructionSchema = {
  type: "object",
  properties: {
    roleName: { type: "string" },
    instruction: { type: "string" },
  },
  required: ["roleName", "instruction"],
  additionalProperties: false,
};

const stepDetailSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    instruction: { type: "string" },
    examples: {
      type: "array",
      items: { type: "string" },
    },
    doneWhen: { type: "string" },
    ifStuck: { type: "string" },
    roleInstructions: {
      type: "array",
      items: stepRoleInstructionSchema,
    },
  },
  required: [
    "title",
    "instruction",
    "examples",
    "doneWhen",
    "ifStuck",
    "roleInstructions",
  ],
  additionalProperties: false,
};

export const activitySuggestionsSchema = {
  type: "object",
  properties: {
    activities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          activityFormatVersion: {
            type: "number",
            enum: [2],
          },
          title: { type: "string" },
          activityStyle: {
            type: "string",
            enum: ["simple", "imaginative"],
          },
          visualTheme: {
            type: "string",
            enum: VISUAL_THEMES,
          },
          theme: { type: "string" },
          summary: { type: "string" },
          kidRole: { type: "string" },
          mission: { type: "string" },
          roleGuide: roleGuideSchema,
          starterIdeas: {
            type: "array",
            items: starterIdeaSchema,
          },
          starterPrompts: {
            type: "array",
            items: { type: "string" },
          },
          firstMoves: {
            type: "array",
            items: { type: "string" },
          },
          stepDetails: {
            type: "array",
            items: stepDetailSchema,
          },
          steps: {
            type: "array",
            items: { type: "string" },
          },
          roles: {
            type: "array",
            items: { type: "string" },
          },
          extensionIdeas: {
            type: "array",
            items: { type: "string" },
          },
          uses: {
            type: "array",
            items: { type: "string" },
          },
          energy: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          mess: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          adultHelp: {
            type: "string",
            enum: ["none", "optional", "needed"],
          },
          estimatedMinutes: {
            type: "number",
          },
          whyItFits: { type: "string" },
          categories: {
            type: "array",
            items: {
              type: "string",
              enum: ACTIVITY_CATEGORIES,
            },
          },
          traits: {
            type: "object",
            properties: {
              setupEffort: {
                type: "string",
                enum: SETUP_EFFORT_VALUES,
              },
              structure: {
                type: "string",
                enum: STRUCTURE_VALUES,
              },
              socialMode: {
                type: "string",
                enum: SOCIAL_MODE_VALUES,
              },
              creativity: {
                type: "string",
                enum: CREATIVITY_VALUES,
              },
              movement: {
                type: "string",
                enum: MOVEMENT_TRAIT_VALUES,
              },
            },
            required: [
              "setupEffort",
              "structure",
              "socialMode",
              "creativity",
              "movement",
            ],
            additionalProperties: false,
          },
        },
        required: [
          "activityFormatVersion",
          "title",
          "activityStyle",
          "visualTheme",
          "theme",
          "summary",
          "kidRole",
          "mission",
          "roleGuide",
          "starterIdeas",
          "starterPrompts",
          "firstMoves",
          "stepDetails",
          "steps",
          "roles",
          "extensionIdeas",
          "uses",
          "energy",
          "mess",
          "adultHelp",
          "estimatedMinutes",
          "whyItFits",
          "categories",
          "traits",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["activities"],
  additionalProperties: false,
};
