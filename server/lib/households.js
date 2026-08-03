// server/lib/households.js

import { getSupabaseAdminClient } from "./supabaseAdminClient.js";

export async function getHouseholdIdForUser(userId) {
  if (!userId) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Could not load household membership:", error);
    return null;
  }

  return data?.household_id || null;
}

/*
 * Ensure the user owns/belongs to a household (idempotent backfill).
 */
export async function ensureUserHousehold(userId) {
  if (!userId) {
    return null;
  }

  const existing = await getHouseholdIdForUser(userId);
  if (existing) {
    const supabase = getSupabaseAdminClient();
    await supabase
      .from("family_settings")
      .update({ household_id: existing })
      .eq("user_id", userId)
      .is("household_id", null);
    return existing;
  }

  const supabase = getSupabaseAdminClient();
  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({ name: "Family", created_by: userId })
    .select("id")
    .single();

  if (householdError || !household?.id) {
    console.warn("Could not create household:", householdError);
    return null;
  }

  const { error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: userId,
      role: "owner",
    });

  if (memberError) {
    console.warn("Could not create household membership:", memberError);
  }

  await supabase
    .from("family_settings")
    .update({ household_id: household.id })
    .eq("user_id", userId);

  return household.id;
}
