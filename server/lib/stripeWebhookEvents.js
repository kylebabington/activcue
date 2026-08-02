// server/lib/stripeWebhookEvents.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

export async function hasProcessedStripeEvent(stripeEventId) {
  if (!stripeEventId) {
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.stripe_event_id);
}

export async function recordProcessedStripeEvent({
  stripeEventId,
  eventType,
}) {
  if (!stripeEventId) {
    throw new Error("Cannot record a Stripe event without an id.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("stripe_webhook_events").upsert(
    {
      stripe_event_id: stripeEventId,
      event_type: eventType || "unknown",
      processed_at: new Date().toISOString(),
    },
    { onConflict: "stripe_event_id" }
  );

  if (error) {
    throw error;
  }
}
