/**
 * Generate AI activities with malformed-JSON recovery and missing-slot fills.
 * Never substitutes a different activityStyle.
 */

import {
  buildMalformedJsonRetrySteer,
  buildMissingSlotRetrySteer,
  parseStructuredActivitiesResponse,
} from "./parseStructuredActivities.js";

export class AiResponseInvalidError extends Error {
  constructor(message = "Could not generate complete activity suggestions.") {
    super(message);
    this.name = "AiResponseInvalidError";
    this.code = "AI_RESPONSE_INVALID";
    this.status = 422;
  }
}

/**
 * @param {object} options
 * @param {Function} options.createResponse - async ({ input, maxOutputTokens, activityCount }) => { outputText, ...usage }
 * @param {Function} options.buildInput - (extraFeedback: string, activityCount: number) => string
 * @param {number} options.expectedCount
 * @param {string} options.activityStyle
 * @param {Function} options.maxTokensForCount
 */
export async function generateActivitiesWithParseRecovery({
  createResponse,
  buildInput,
  expectedCount,
  activityStyle,
  maxTokensForCount,
  baseFeedback = "",
} = {}) {
  const target = Math.max(1, Number(expectedCount) || 1);
  let usageAcc = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    model: null,
    responseId: null,
  };

  function mergeUsage(meta) {
    if (!meta) return;
    usageAcc = {
      model: meta.model || usageAcc.model,
      inputTokens: (usageAcc.inputTokens || 0) + (meta.inputTokens || 0),
      outputTokens: (usageAcc.outputTokens || 0) + (meta.outputTokens || 0),
      totalTokens: (usageAcc.totalTokens || 0) + (meta.totalTokens || 0),
      responseId: meta.responseId || usageAcc.responseId,
    };
  }

  async function callOnce({ feedback, count, isFormatRetry = false }) {
    const input = buildInput(feedback, count);
    const result = await createResponse({
      input,
      maxOutputTokens: maxTokensForCount(count),
      activityCount: count,
      isFormatRetry,
    });
    mergeUsage(result);
    return parseStructuredActivitiesResponse(result?.outputText, {
      expectedCount: count,
    });
  }

  // First attempt
  let parsed = await callOnce({
    feedback: baseFeedback,
    count: target,
  });

  // One full retry on total parse failure
  if (!parsed.ok && !parsed.partial) {
    const steer = buildMalformedJsonRetrySteer(parsed.reason);
    const retryFeedback = [baseFeedback, steer].filter(Boolean).join("\n\n");
    parsed = await callOnce({
      feedback: retryFeedback,
      count: target,
      isFormatRetry: true,
    });
  }

  // Still total failure after retry
  if (!parsed.ok && !parsed.partial) {
    throw new AiResponseInvalidError(
      "The idea server returned an incomplete response. Please try again."
    );
  }

  let activities = [...parsed.activities];

  // Partial: fill missing slots one at a time
  while (activities.length < target) {
    const missing = 1;
    const titles = activities.map((a) => a?.title).filter(Boolean);
    const steer = buildMissingSlotRetrySteer({
      missingCount: missing,
      existingTitles: titles,
      activityStyle,
    });
    const fillFeedback = [baseFeedback, steer].filter(Boolean).join("\n\n");
    const fillParsed = await callOnce({
      feedback: fillFeedback,
      count: missing,
      isFormatRetry: true,
    });

    if (!fillParsed.ok && fillParsed.activities.length === 0) {
      // One more attempt for this slot
      const retrySteer = buildMalformedJsonRetrySteer(fillParsed.reason);
      const retryFill = await callOnce({
        feedback: [fillFeedback, retrySteer].filter(Boolean).join("\n\n"),
        count: missing,
        isFormatRetry: true,
      });
      if (!retryFill.ok && retryFill.activities.length === 0) {
        throw new AiResponseInvalidError(
          "The idea server could not finish a complete set of activities. Please try again."
        );
      }
      activities.push(...retryFill.activities.slice(0, missing));
    } else {
      activities.push(...fillParsed.activities.slice(0, missing));
    }
  }

  // Guard: never accept wrong style when imaginative was requested
  if (String(activityStyle).toLowerCase() === "imaginative") {
    const wrongStyle = activities.filter((activity) => {
      const style = String(
        activity?.activityStyle || activity?.style || ""
      )
        .trim()
        .toLowerCase();
      return style && style !== "imaginative";
    });
    if (wrongStyle.length > 0) {
      throw new AiResponseInvalidError(
        "Generated activities did not match the requested imaginative style."
      );
    }
  }

  return {
    activities: activities.slice(0, target),
    usage: usageAcc,
  };
}
