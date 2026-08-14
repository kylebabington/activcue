// src/api/feedbackApi.js

import { supabase } from "../lib/supabaseClient";
import { authenticatedRequest } from "./apiClient";

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
 * Insert product feedback for the signed-in user via the Railway API.
 */
export async function submitUserFeedback({ category, message, page }) {
  const trimmed = String(message || "").trim();
  if (!trimmed) {
    throw new Error("Write a short message before sending.");
  }

  const response = await authenticatedRequest("/api/feedback", {
    method: "POST",
    body: JSON.stringify({
      category,
      message: trimmed,
      page: String(page || "").slice(0, 500),
    }),
  });

  return response.json();
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
