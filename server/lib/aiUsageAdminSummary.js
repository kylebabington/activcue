// server/lib/aiUsageAdminSummary.js

const KNOWN_OPERATIONS = ["activity-suggestions", "quest-step-hint"];

function roundUsd(value) {
  return Math.round((Number(value) || 0) * 1_000_000) / 1_000_000;
}

function emptyOperationCounts() {
  return { success: 0, failure: 0, estimatedCost: 0 };
}

/**
 * Aggregate ai_usage_events rows for the admin spend dashboard.
 */
export function buildAiUsageAdminSummary(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const byOperation = Object.fromEntries(
    KNOWN_OPERATIONS.map((name) => [name, emptyOperationCounts()])
  );
  const byFailureType = {};
  let estimatedCost = 0;
  let successCount = 0;
  let failureCount = 0;

  for (const row of list) {
    const operation =
      typeof row?.operation === "string" && row.operation.trim()
        ? row.operation.trim()
        : "unknown";
    if (!byOperation[operation]) {
      byOperation[operation] = emptyOperationCounts();
    }

    if (row?.success) {
      successCount += 1;
      byOperation[operation].success += 1;
      const cost = Number(row.estimated_cost) || 0;
      estimatedCost += cost;
      byOperation[operation].estimatedCost += cost;
      continue;
    }

    failureCount += 1;
    byOperation[operation].failure += 1;
    const failureType =
      typeof row?.failure_type === "string" && row.failure_type.trim()
        ? row.failure_type.trim()
        : "unknown";
    byFailureType[failureType] = (byFailureType[failureType] || 0) + 1;
  }

  for (const counts of Object.values(byOperation)) {
    counts.estimatedCost = roundUsd(counts.estimatedCost);
  }

  return {
    estimatedCost: roundUsd(estimatedCost),
    successCount,
    failureCount,
    callCount: successCount + failureCount,
    byOperation,
    byFailureType,
  };
}
