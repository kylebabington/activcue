/**
 * Approximate USD cost from token counts for common OpenAI models.
 * Rates are $/1M tokens and intentionally conservative for accounting.
 */
const MODEL_RATES_PER_MILLION = {
  "gpt-5.4-mini": { input: 0.25, output: 2.0 },
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "o3-mini": { input: 1.1, output: 4.4 },
};

const DEFAULT_RATES = { input: 0.5, output: 2.0 };

function normalizeModelKey(model) {
  if (typeof model !== "string" || !model.trim()) {
    return "";
  }
  return model.trim().toLowerCase();
}

export function getOpenAiModelRates(model) {
  const key = normalizeModelKey(model);
  if (!key) {
    return DEFAULT_RATES;
  }

  if (MODEL_RATES_PER_MILLION[key]) {
    return MODEL_RATES_PER_MILLION[key];
  }

  const matched = Object.keys(MODEL_RATES_PER_MILLION).find(
    (known) => key.startsWith(known) || known.startsWith(key)
  );

  return matched ? MODEL_RATES_PER_MILLION[matched] : DEFAULT_RATES;
}

/**
 * @returns {number|null} Estimated USD cost, or null when tokens are missing.
 */
export function estimateOpenAiCost({
  model,
  inputTokens = 0,
  outputTokens = 0,
} = {}) {
  const input = Number(inputTokens);
  const output = Number(outputTokens);

  if (!Number.isFinite(input) || !Number.isFinite(output)) {
    return null;
  }
  if (input < 0 || output < 0) {
    return null;
  }
  if (input === 0 && output === 0) {
    return 0;
  }

  const rates = getOpenAiModelRates(model);
  const cost =
    (input / 1_000_000) * rates.input + (output / 1_000_000) * rates.output;

  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function classifyAiFailureType(error) {
  if (!error) {
    return "unknown";
  }

  const nested = error.error && typeof error.error === "object" ? error.error : {};
  const status = Number(error.status) || 0;
  const code = String(error.code || nested.code || "").toLowerCase();
  const type = String(error.type || nested.type || "").toLowerCase();
  const message = String(error.message || nested.message || "").toLowerCase();

  if (
    code === "insufficient_quota" ||
    type.includes("insufficient_quota") ||
    message.includes("insufficient_quota") ||
    message.includes("exceeded your current quota")
  ) {
    return "quota";
  }

  if (
    status === 429 ||
    code.includes("rate_limit") ||
    type.includes("rate_limit") ||
    message.includes("rate limit")
  ) {
    return "rate_limit";
  }

  if (
    status === 401 ||
    status === 403 ||
    code === "invalid_api_key" ||
    message.includes("api key")
  ) {
    return "auth";
  }

  if (
    status === 408 ||
    code.includes("timeout") ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return "timeout";
  }

  if (
    status === 400 ||
    code.includes("invalid") ||
    type.includes("invalid_request")
  ) {
    return "invalid_request";
  }

  if (status >= 500 || type.includes("server_error")) {
    return "server_error";
  }

  return "unknown";
}
