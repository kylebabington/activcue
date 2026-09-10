import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetStripeClientsForTests,
  getStripeClient,
  getStripeClientForLivemode,
  getStripeTestClient,
} from "./stripeClient.js";

describe("stripeClient live/test separation", () => {
  const previousLive = process.env.STRIPE_SECRET_KEY;
  const previousTest = process.env.STRIPE_SECRET_KEY_TEST;

  beforeEach(() => {
    __resetStripeClientsForTests();
    process.env.STRIPE_SECRET_KEY = "sk_live_test_key_aaaaaaaa";
    delete process.env.STRIPE_SECRET_KEY_TEST;
  });

  afterEach(() => {
    __resetStripeClientsForTests();
    if (previousLive === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousLive;
    if (previousTest === undefined) delete process.env.STRIPE_SECRET_KEY_TEST;
    else process.env.STRIPE_SECRET_KEY_TEST = previousTest;
  });

  it("creates the live client from STRIPE_SECRET_KEY", () => {
    const stripe = getStripeClient();
    expect(stripe).not.toBeNull();
    expect(getStripeClient()).toBe(stripe);
  });

  it("returns null for the test client when STRIPE_SECRET_KEY_TEST is absent", () => {
    expect(getStripeTestClient()).toBeNull();
  });

  it("creates a separate test client from STRIPE_SECRET_KEY_TEST", () => {
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_sandbox_key_bbbbbbbb";
    const live = getStripeClient();
    const test = getStripeTestClient();
    expect(live).not.toBeNull();
    expect(test).not.toBeNull();
    expect(test).not.toBe(live);
  });

  it("selects the live client for livemode true", () => {
    const result = getStripeClientForLivemode(true);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("live");
    expect(result.stripe).toBe(getStripeClient());
  });

  it("selects the test client for livemode false", () => {
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_sandbox_key_bbbbbbbb";
    const result = getStripeClientForLivemode(false);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("test");
    expect(result.stripe).toBe(getStripeTestClient());
  });

  it("fails closed for sandbox events when STRIPE_SECRET_KEY_TEST is missing", () => {
    const result = getStripeClientForLivemode(false);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing-test-secret-key");
    expect(result.mode).toBe("test");
  });

  it("rejects invalid livemode values instead of defaulting to live", () => {
    expect(getStripeClientForLivemode(undefined).ok).toBe(false);
    expect(getStripeClientForLivemode(null).reason).toBe("invalid-livemode");
  });
});
