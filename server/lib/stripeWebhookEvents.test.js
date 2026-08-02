import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseAdminClient.js", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "../lib/supabaseAdminClient.js";
import {
  hasProcessedStripeEvent,
  recordProcessedStripeEvent,
} from "./stripeWebhookEvents.js";

describe("stripeWebhookEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when an event id was already processed", async () => {
    getSupabaseAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { stripe_event_id: "evt_123" },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(hasProcessedStripeEvent("evt_123")).resolves.toBe(true);
  });

  it("returns false for a new event id", async () => {
    getSupabaseAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(hasProcessedStripeEvent("evt_new")).resolves.toBe(false);
  });

  it("records processed events with upsert", async () => {
    const upsert = vi.fn(async () => ({ error: null }));

    getSupabaseAdminClient.mockReturnValue({
      from: () => ({
        upsert,
      }),
    });

    await recordProcessedStripeEvent({
      stripeEventId: "evt_abc",
      eventType: "customer.subscription.updated",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_event_id: "evt_abc",
        event_type: "customer.subscription.updated",
      }),
      { onConflict: "stripe_event_id" }
    );
  });
});
