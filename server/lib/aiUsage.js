// server/lib/aiUsage.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";
import {
  classifyAiFailureType,
  estimateOpenAiCost,
} from "./openaiCost.js";

function toNullableInt(value) {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.round(n);
}

function toNullableCost(value) {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.round(n * 1_000_000) / 1_000_000;
}

export async function recordAiUsageEvent({
  userId,
  operation,
  model = null,
  inputTokens = null,
  outputTokens = null,
  estimatedCost = null,
  latencyMs = null,
  success = true,
  failureType = null,
  error = null,
} = {}) {
  if (!userId || !operation) {
    return;
  }

  const resolvedInputTokens = toNullableInt(inputTokens);
  const resolvedOutputTokens = toNullableInt(outputTokens);
  const resolvedLatencyMs = toNullableInt(latencyMs);
  const resolvedSuccess = Boolean(success);

  let resolvedEstimatedCost = toNullableCost(estimatedCost);
  if (
    resolvedEstimatedCost == null &&
    (resolvedInputTokens != null || resolvedOutputTokens != null)
  ) {
    resolvedEstimatedCost = estimateOpenAiCost({
      model,
      inputTokens: resolvedInputTokens || 0,
      outputTokens: resolvedOutputTokens || 0,
    });
  }

  let resolvedFailureType =
    typeof failureType === "string" && failureType.trim()
      ? failureType.trim()
      : null;

  if (!resolvedSuccess && !resolvedFailureType) {
    resolvedFailureType = classifyAiFailureType(error);
  }

  if (resolvedSuccess) {
    resolvedFailureType = null;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error: insertError } = await supabase.from("ai_usage_events").insert({
      user_id: userId,
      operation,
      model: typeof model === "string" && model.trim() ? model.trim() : null,
      input_tokens: resolvedInputTokens,
      output_tokens: resolvedOutputTokens,
      estimated_cost: resolvedEstimatedCost,
      latency_ms: resolvedLatencyMs,
      success: resolvedSuccess,
      failure_type: resolvedFailureType,
    });

    if (insertError) {
      console.warn("Could not record AI usage event:", insertError);
    }
  } catch (recordError) {
    console.warn("Could not record AI usage event:", recordError);
  }
}
