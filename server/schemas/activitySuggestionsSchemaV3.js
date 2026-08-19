import {
  ACTIVITY_CATEGORIES,
  CREATIVITY_VALUES,
  MOVEMENT_TRAIT_VALUES,
  SETUP_EFFORT_VALUES,
  SOCIAL_MODE_VALUES,
  STRUCTURE_VALUES,
} from "./activityTaxonomy.js";
import {
  STARTER_IDEA_KINDS,
  VISUAL_THEMES,
} from "./activitySuggestionsSchema.js";

const childRoleSchemaV3 = {
  type: "object",
  properties: {
    childName: { type: "string" },
    age: { type: "number" },
    roleTitle: { type: "string" },
    responsibility: { type: "string" },
    firstAction: { type: "string" },
  },
  required: ["childName", "age", "roleTitle", "responsibility", "firstAction"],
  additionalProperties: false,
};

const roleGuideSchemaV3 = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    childRoles: {
      type: "array",
      items: childRoleSchemaV3,
    },
  },
  required: ["name", "description", "childRoles"],
  additionalProperties: false,
};

const ageFitSchemaV3 = {
  type: "object",
  properties: {
    minAge: { type: "number" },
    maxAge: { type: "number" },
    targetAges: {
      type: "array",
      items: { type: "number" },
    },
    maturityLevel: {
      type: "string",
      enum: ["young-child", "child", "tween", "teen", "mixed-age"],
    },
    independenceLevel: {
      type: "string",
      enum: ["adult-led", "some-help", "mostly-independent", "independent"],
    },
    ageFitReason: { type: "string" },
  },
  required: [
    "minAge",
    "maxAge",
    "targetAges",
    "maturityLevel",
    "independenceLevel",
    "ageFitReason",
  ],
  additionalProperties: false,
};

const starterIdeaSchemaV3 = {
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

const stepRoleInstructionSchemaV3 = {
  type: "object",
  properties: {
    roleName: { type: "string" },
    instruction: { type: "string" },
  },
  required: ["roleName", "instruction"],
  additionalProperties: false,
};

const stepDetailSchemaV3 = {
  type: "object",
  properties: {
    title: { type: "string" },
    actions: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    starterIdeas: {
      type: "array",
      items: starterIdeaSchemaV3,
    },
    doneWhen: { type: "string" },
    ifStuck: { type: "string" },
    roleInstructions: {
      type: "array",
      items: stepRoleInstructionSchemaV3,
    },
  },
  required: [
    "title",
    "actions",
    "starterIdeas",
    "doneWhen",
    "ifStuck",
    "roleInstructions",
  ],
  additionalProperties: false,
};

const setupGuideSchemaV3 = {
  type: "object",
  properties: {
    needed: {
      type: "array",
      items: { type: "string" },
    },
    steps: {
      type: "array",
      items: { type: "string" },
    },
    readyWhen: { type: "string" },
  },
  required: ["needed", "steps", "readyWhen"],
  additionalProperties: false,
};

const finishGuideSchemaV3 = {
  type: "object",
  properties: {
    action: { type: "string" },
    example: { type: "string" },
    doneWhen: { type: "string" },
    extensions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["action", "example", "doneWhen", "extensions"],
  additionalProperties: false,
};

/** Activity Format V3 — actions[] is source of truth; instruction is derived server-side. */
export const activitySuggestionsSchemaV3 = {
  type: "object",
  properties: {
    activities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          activityFormatVersion: {
            type: "number",
            enum: [3],
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
          story: { type: "string" },
          summary: { type: "string" },
          roleGuide: roleGuideSchemaV3,
          ageFit: ageFitSchemaV3,
          setupGuide: setupGuideSchemaV3,
          starterIdeas: {
            type: "array",
            items: starterIdeaSchemaV3,
          },
          stepDetails: {
            type: "array",
            items: stepDetailSchemaV3,
          },
          finishGuide: finishGuideSchemaV3,
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
          "story",
          "summary",
          "roleGuide",
          "ageFit",
          "setupGuide",
          "starterIdeas",
          "stepDetails",
          "finishGuide",
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
