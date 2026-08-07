/**
 * Grant ActivCue Plus (billing_exempt) and/or admin role via service role.
 *
 * Usage:
 *   node server/scripts/setProfilePrivileges.js --user-id <uuid> --billing-exempt
 *   node server/scripts/setProfilePrivileges.js --user-id <uuid> --role admin --billing-exempt
 *
 * Never accept role/billing_exempt from the browser. This script is ops-only.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] || null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const userId = readArg("--user-id");
  const role = readArg("--role");
  const billingExempt = hasFlag("--billing-exempt");
  const clearBillingExempt = hasFlag("--clear-billing-exempt");

  if (!userId) {
    console.error("Required: --user-id <uuid>");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.");
    process.exit(1);
  }

  const patch = {};
  if (role === "admin" || role === "user") {
    patch.role = role;
  }
  if (billingExempt) {
    patch.billing_exempt = true;
  }
  if (clearBillingExempt) {
    patch.billing_exempt = false;
  }

  if (Object.keys(patch).length === 0) {
    console.error("Pass --role admin|user and/or --billing-exempt / --clear-billing-exempt");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", userId)
    .select("user_id, role, billing_exempt")
    .single();

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log("Updated profile:", data);
}

main();
