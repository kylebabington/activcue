import OpenAI from "openai";

export const OPENAI_MODEL = "gpt-5.4-mini";

export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function createStructuredResponse(client, { instructions, input, schemaName, schema }) {
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    instructions,
    input,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  return response.output_text;
}
