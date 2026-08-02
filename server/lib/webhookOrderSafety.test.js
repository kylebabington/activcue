import { describe, expect, it, vi } from "vitest";

/**
 * Documents the order-safe webhook rule: retrieve current subscription
 * before writing, never trust an older embedded snapshot alone.
 */
describe("subscription webhook order safety", () => {
  it("prefers a retrieved subscription over the event snapshot", async () => {
    const snapshot = {
      id: "sub_1",
      status: "active",
      cancel_at_period_end: false,
    };
    const current = {
      id: "sub_1",
      status: "canceled",
      cancel_at_period_end: false,
    };

    const stripe = {
      subscriptions: {
        retrieve: vi.fn(async () => current),
      },
    };

    const upsert = vi.fn(async () => undefined);

    const subscriptionId = snapshot.id;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await upsert(subscription);

    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_1");
    expect(upsert).toHaveBeenCalledWith(current);
    expect(upsert).not.toHaveBeenCalledWith(snapshot);
  });

  it("skips reprocessing when an event id is already recorded", async () => {
    const processed = new Set(["evt_dup"]);
    const process = vi.fn();

    async function handle(event) {
      if (processed.has(event.id)) {
        return { duplicate: true };
      }
      process(event);
      processed.add(event.id);
      return { duplicate: false };
    }

    await expect(handle({ id: "evt_dup", type: "x" })).resolves.toEqual({
      duplicate: true,
    });
    await expect(handle({ id: "evt_new", type: "x" })).resolves.toEqual({
      duplicate: false,
    });
    expect(process).toHaveBeenCalledTimes(1);
  });
});
