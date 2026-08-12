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

/**
 * Structured Responses API call with usage + latency metadata for cost logging.
 * Defaults to low text verbosity to keep activity JSON prose shorter.
 */
export async function createStructuredResponseWithMeta(
  client,
  {
    instructions,
    input,
    schemaName,
    schema,
    model = OPENAI_MODEL,
    verbosity = "low",
    maxOutputTokens = null,
  }
) {
  const startedAt = Date.now();
  const textConfig = {
    format: {
      type: "json_schema",
      name: schemaName,
      strict: true,
      schema,
    },
  };
  if (verbosity === "low" || verbosity === "medium" || verbosity === "high") {
    textConfig.verbosity = verbosity;
  }

  const request = {
    model,
    instructions,
    input,
    text: textConfig,
  };
  if (Number.isFinite(Number(maxOutputTokens)) && Number(maxOutputTokens) > 0) {
    request.max_output_tokens = Math.round(Number(maxOutputTokens));
  }

  const response = await client.responses.create(request);

  return {
    outputText: response.output_text,
    model: response.model || model,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
    totalTokens: response.usage?.total_tokens ?? null,
    responseId: response.id || null,
    latencyMs: Date.now() - startedAt,
    raw: response,
  };
}

/** @returns {Promise<string>} output text only (scripts / simple callers) */
export async function createStructuredResponse(client, options) {
  const result = await createStructuredResponseWithMeta(client, options);
  return result.outputText;
}
