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
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["activities"],
  additionalProperties: false,
};
