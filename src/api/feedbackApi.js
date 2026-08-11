// src/api/feedbackApi.js

import { supabase } from "../lib/supabaseClient";

export const FEEDBACK_CATEGORIES = Object.freeze([
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "liked", label: "Something I liked" },
  { value: "other", label: "Other" },
]);

export const FEEDBACK_STATUSES = Object.freeze([
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "planned", label: "Planned" },
  { value: "resolved", label: "Resolved" },
]);

/**
 * Insert product feedback for the signed-in user (RLS enforces ownership).
 */
export async function submitUserFeedback({ category, message, page }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user?.id) {
    throw new Error("Sign in to send feedback.");
  }

  const trimmed = String(message || "").trim();
  if (!trimmed) {
    throw new Error("Write a short message before sending.");
  }

  const { data, error } = await supabase
    .from("user_feedback")
    .insert({
      user_id: user.id,
      category,
      message: trimmed,
      page: String(page || "").slice(0, 500),
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listUserFeedback({ status } = {}) {
  let query = supabase
    .from("user_feedback")
    .select("id, user_id, category, message, page, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export async function updateUserFeedbackStatus(id, status) {
  const { data, error } = await supabase
    .from("user_feedback")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
