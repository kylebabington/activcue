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
import { QUALITY_CONTRACT_VERSION } from "../utils/activityFormatConstants.js";

const childRoleSchemaV4 = {
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

const roleGuideSchemaV4 = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    childRoles: {
      type: "array",
      items: childRoleSchemaV4,
    },
  },
  required: ["name", "description", "childRoles"],
  additionalProperties: false,
};

const ageFitSchemaV4 = {
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

const starterIdeaSchemaV4 = {
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

const stepRoleInstructionSchemaV4 = {
  type: "object",
  properties: {
    roleName: { type: "string" },
    instruction: { type: "string" },
  },
  required: ["roleName", "instruction"],
  additionalProperties: false,
};

const stepDetailSchemaV4 = {
  type: "object",
  properties: {
    title: { type: "string" },
    sceneSetup: { type: "string" },
    actions: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    starterIdeas: {
      type: "array",
      items: starterIdeaSchemaV4,
    },
    doneWhen: { type: "string" },
    sceneOutcome: { type: "string" },
    ifStuck: { type: "string" },
    roleInstructions: {
      type: "array",
      items: stepRoleInstructionSchemaV4,
    },
  },
  required: [
    "title",
    "sceneSetup",
    "actions",
    "starterIdeas",
    "doneWhen",
    "sceneOutcome",
    "ifStuck",
    "roleInstructions",
  ],
  additionalProperties: false,
};

const setupGuideSchemaV4 = {
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

const finishGuideSchemaV4 = {
  type: "object",
  properties: {
    resolution: { type: "string" },
    action: { type: "string" },
    example: { type: "string" },
    doneWhen: { type: "string" },
    extensions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["resolution", "action", "example", "doneWhen", "extensions"],
  additionalProperties: false,
};

/** Activity Format V4 — imaginative-only causal story structure. */
export const activitySuggestionsSchemaV4 = {
  type: "object",
  properties: {
    activities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          activityFormatVersion: {
            type: "number",
            enum: [4],
          },
          qualityContractVersion: {
            type: "number",
            enum: [QUALITY_CONTRACT_VERSION],
          },
          title: { type: "string" },
          activityStyle: {
            type: "string",
            enum: ["imaginative"],
          },
          visualTheme: {
            type: "string",
            enum: VISUAL_THEMES,
          },
          story: { type: "string" },
          summary: { type: "string" },
          roleGuide: roleGuideSchemaV4,
          ageFit: ageFitSchemaV4,
          setupGuide: setupGuideSchemaV4,
          starterIdeas: {
            type: "array",
            items: starterIdeaSchemaV4,
          },
          stepDetails: {
            type: "array",
            items: stepDetailSchemaV4,
          },
          finishGuide: finishGuideSchemaV4,
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
          "qualityContractVersion",
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

export {
  stepDetailSchemaV4,
  finishGuideSchemaV4,
  roleGuideSchemaV4,
};
