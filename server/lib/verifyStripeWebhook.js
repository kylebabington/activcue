/**
 * Verify a Stripe webhook signature against one or more signing secrets.
 *
 * Primary secret (STRIPE_WEBHOOK_SECRET) is tried first for backward
 * compatibility. Optional STRIPE_WEBHOOK_SECRET_TEST covers sandbox endpoints
 * that share the same Railway URL.
 *
 * Never choose a secret from unverified event body fields (e.g. livemode).
 */

/**
 * @param {import("stripe").default} stripe
 * @param {Buffer|string} rawBody
 * @param {string} signature
 * @param {{
 *   primarySecret?: string|null,
 *   testSecret?: string|null,
 * }} [secrets]
 * @returns {{
 *   ok: true,
 *   event: object,
 *   secretSource: "live" | "test",
 * } | {
 *   ok: false,
 *   error: unknown,
 *   reason: "missing-primary-secret" | "signature-verification-failed",
 * }}
 */
export function verifyStripeWebhookEvent(
  stripe,
  rawBody,
  signature,
  secrets = {}
) {
  const primarySecret =
    "primarySecret" in secrets
      ? secrets.primarySecret || null
      : process.env.STRIPE_WEBHOOK_SECRET || null;
  const testSecret =
    "testSecret" in secrets
      ? secrets.testSecret || null
      : process.env.STRIPE_WEBHOOK_SECRET_TEST || null;

  if (!primarySecret) {
    return {
      ok: false,
      reason: "missing-primary-secret",
      error: new Error("STRIPE_WEBHOOK_SECRET is not configured."),
    };
  }

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      primarySecret
    );
    return { ok: true, event, secretSource: "live" };
  } catch (primaryError) {
    if (!testSecret) {
      return {
        ok: false,
        reason: "signature-verification-failed",
        error: primaryError,
      };
    }

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        testSecret
      );
      return { ok: true, event, secretSource: "test" };
    } catch (testError) {
      return {
        ok: false,
        reason: "signature-verification-failed",
        error: testError,
      };
    }
  }
}
