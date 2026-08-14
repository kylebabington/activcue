// server/lib/submitUserFeedback.js

export const FEEDBACK_CATEGORIES = new Set(["bug", "idea", "liked", "other"]);
export const FEEDBACK_MESSAGE_MAX_LENGTH = 4000;
export const FEEDBACK_PAGE_MAX_LENGTH = 500;
export const FEEDBACK_DUPLICATE_WINDOW_MS = 60 * 1000;

export class FeedbackSubmitError extends Error {
  constructor(
    message,
    { code = "FEEDBACK_CREATE_FAILED", status = 500 } = {}
  ) {
    super(message);
    this.name = "FeedbackSubmitError";
    this.code = code;
    this.status = status;
  }
}

export function parseFeedbackInput({ category, message, page } = {}) {
  const normalizedCategory =
    typeof category === "string" ? category.trim() : "";
  if (!FEEDBACK_CATEGORIES.has(normalizedCategory)) {
    return {
      error: {
        message: "Choose a valid feedback category.",
        code: "FEEDBACK_INVALID",
      },
    };
  }

  const trimmedMessage =
    typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage) {
    return {
      error: {
        message: "Write a short message before sending.",
        code: "FEEDBACK_INVALID",
      },
    };
  }
  if (trimmedMessage.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
    return {
      error: {
        message: `Keep feedback under ${FEEDBACK_MESSAGE_MAX_LENGTH} characters.`,
        code: "FEEDBACK_INVALID",
      },
    };
  }

  return {
    category: normalizedCategory,
    message: trimmedMessage,
    page: String(page || "").slice(0, FEEDBACK_PAGE_MAX_LENGTH),
  };
}

export async function submitUserFeedback({
  supabase,
  userId,
  category,
  message,
  page,
  now = new Date(),
}) {
  if (!userId) {
    throw new FeedbackSubmitError("Sign in to send feedback.", {
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
    });
  }

  const since = new Date(
    now.getTime() - FEEDBACK_DUPLICATE_WINDOW_MS
  ).toISOString();

  const { data: existing, error: lookupError } = await supabase
    .from("user_feedback")
    .select("id")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("message", message)
    .eq("page", page)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("Could not look up recent user feedback:", lookupError);
    throw new FeedbackSubmitError("Could not send feedback.", {
      code: "FEEDBACK_CREATE_FAILED",
      status: 500,
    });
  }

  if (existing?.id) {
    return { id: existing.id, duplicate: true };
  }

  const { data, error } = await supabase
    .from("user_feedback")
    .insert({
      user_id: userId,
      category,
      message,
      page,
      status: "new",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("Could not insert user feedback:", error);
    throw new FeedbackSubmitError("Could not send feedback.", {
      code: "FEEDBACK_CREATE_FAILED",
      status: 500,
    });
  }

  return { id: data.id, duplicate: false };
}
