import {
  ACTIVITY_CATEGORIES,
  CREATIVITY_VALUES,
  MOVEMENT_TRAIT_VALUES,
  SETUP_EFFORT_VALUES,
  SOCIAL_MODE_VALUES,
  STRUCTURE_VALUES,
} from "./activityTaxonomy.js";

export const activitySuggestionsSchema = {
  type: "object",
  properties: {
    activities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          activityStyle: {
            type: "string",
            enum: ["simple", "imaginative"],
          },
          theme: { type: "string" },
          summary: { type: "string" },
          kidRole: { type: "string" },
          mission: { type: "string" },
          starterPrompts: {
            type: "array",
            items: { type: "string" },
          },
          firstMoves: {
            type: "array",
            items: { type: "string" },
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
          "title",
          "activityStyle",
          "theme",
          "summary",
          "kidRole",
          "mission",
          "starterPrompts",
          "firstMoves",
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
