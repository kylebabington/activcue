export const questStepHintSchema = {
  type: "object",
  properties: {
    hint: {
      type: "string",
    },
  },
  required: ["hint"],
  additionalProperties: false,
};
