import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

import { verifyStripeWebhookEvent } from "./verifyStripeWebhook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIVE_SECRET = "whsec_test_live_secret_aaaaaaaa";
const TEST_SECRET = "whsec_test_sandbox_secret_bbbbbbbb";

function buildSignedPayload(secret, overrides = {}) {
  const stripe = new Stripe("sk_test_placeholder");
  const payload = JSON.stringify({
    id: "evt_test_webhook",
    object: "event",
    type: "customer.subscription.updated",
    livemode: false,
    data: {
      object: {
        id: "sub_test",
        object: "subscription",
        status: "active",
      },
    },
    ...overrides,
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return {
    stripe,
    payload,
    rawBody: Buffer.from(payload, "utf8"),
    signature,
  };
}

describe("verifyStripeWebhookEvent", () => {
  const previousLive = process.env.STRIPE_WEBHOOK_SECRET;
  const previousTest = process.env.STRIPE_WEBHOOK_SECRET_TEST;

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = LIVE_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
  });

  afterEach(() => {
    if (previousLive === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousLive;
    }
    if (previousTest === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET_TEST = previousTest;
    }
  });

  it("accepts a webhook signed with STRIPE_WEBHOOK_SECRET", () => {
    const { stripe, rawBody, signature } = buildSignedPayload(LIVE_SECRET);
    const result = verifyStripeWebhookEvent(stripe, rawBody, signature);

    expect(result.ok).toBe(true);
    expect(result.secretSource).toBe("live");
    expect(result.event.id).toBe("evt_test_webhook");
  });

  it("accepts a webhook signed with STRIPE_WEBHOOK_SECRET_TEST", () => {
    process.env.STRIPE_WEBHOOK_SECRET_TEST = TEST_SECRET;
    const { stripe, rawBody, signature } = buildSignedPayload(TEST_SECRET);
    const result = verifyStripeWebhookEvent(stripe, rawBody, signature);

    expect(result.ok).toBe(true);
    expect(result.secretSource).toBe("test");
    expect(result.event.type).toBe("customer.subscription.updated");
  });

  it("rejects an invalid signature with verification failure", () => {
    process.env.STRIPE_WEBHOOK_SECRET_TEST = TEST_SECRET;
    const { stripe, rawBody } = buildSignedPayload(LIVE_SECRET);
    const result = verifyStripeWebhookEvent(
      stripe,
      rawBody,
      "t=1,v1=deadbeef"
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("signature-verification-failed");
  });

  it("still verifies the live secret when the test secret is absent", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    const { stripe, rawBody, signature } = buildSignedPayload(LIVE_SECRET);
    const result = verifyStripeWebhookEvent(stripe, rawBody, signature);

    expect(result.ok).toBe(true);
    expect(result.secretSource).toBe("live");
  });

  it("does not fall back to the test secret when the live secret already matches", () => {
    process.env.STRIPE_WEBHOOK_SECRET_TEST = TEST_SECRET;
    const { stripe, rawBody, signature } = buildSignedPayload(LIVE_SECRET);
    const constructEvent = vi.spyOn(stripe.webhooks, "constructEvent");

    const result = verifyStripeWebhookEvent(stripe, rawBody, signature);

    expect(result.ok).toBe(true);
    expect(result.secretSource).toBe("live");
    expect(constructEvent).toHaveBeenCalledTimes(1);
    expect(constructEvent.mock.calls[0][2]).toBe(LIVE_SECRET);
  });

  it("passes the raw body Buffer through to constructEvent", () => {
    const { stripe, rawBody, signature } = buildSignedPayload(LIVE_SECRET);
    const constructEvent = vi.spyOn(stripe.webhooks, "constructEvent");

    verifyStripeWebhookEvent(stripe, rawBody, signature);

    expect(Buffer.isBuffer(constructEvent.mock.calls[0][0])).toBe(true);
    expect(constructEvent.mock.calls[0][0].equals(rawBody)).toBe(true);
  });

  it("fails closed when the primary secret is missing", () => {
    const { stripe, rawBody, signature } = buildSignedPayload(LIVE_SECRET);
    const result = verifyStripeWebhookEvent(stripe, rawBody, signature, {
      primarySecret: null,
      testSecret: TEST_SECRET,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing-primary-secret");
  });
});

describe("Stripe webhook middleware mounting", () => {
  it("registers the webhook with express.raw before express.json", () => {
    const indexSource = readFileSync(
      path.join(__dirname, "../index.js"),
      "utf8"
    );
    const webhookIdx = indexSource.indexOf('"/api/billing/webhook"');
    const rawIdx = indexSource.indexOf(
      'express.raw({ type: "application/json" })'
    );
    const jsonIdx = indexSource.indexOf("app.use(express.json())");

    expect(webhookIdx).toBeGreaterThan(-1);
    expect(rawIdx).toBeGreaterThan(webhookIdx);
    expect(jsonIdx).toBeGreaterThan(rawIdx);
  });
});
