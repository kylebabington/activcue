// server/lib/aiUsage.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

export async function recordAiUsageEvent({
  userId,
  operation,
  success = true,
}) {
  if (!userId || !operation) {
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("ai_usage_events").insert({
      user_id: userId,
      operation,
      success: Boolean(success),
    });

    if (error) {
      console.warn("Could not record AI usage event:", error);
    }
  } catch (error) {
    console.warn("Could not record AI usage event:", error);
  }
}
