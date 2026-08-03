// src/utils/rejectionReasons.js

export const REJECTION_REASONS = Object.freeze([
  "not-interested",
  "too-hard",
  "too-easy",
  "too-young",
  "too-old",
  "too-messy",
  "too-loud",
  "missing-supplies",
  "missing-materials",
  "needs-too-much-help",
  "wrong-mood",
  "wrong-moment",
  "already-did-it",
  "other",
]);

const FEEDBACK_TO_REJECTION = {
  "too-messy": "too-messy",
  "too-hard": "too-hard",
  "too-easy": "too-easy",
  "too-young": "too-young",
  "too-old": "too-old",
  "need-quieter": "too-loud",
  "wrong-moment": "wrong-moment",
  activity_rejected: "not-interested",
  "need-another-idea": "not-interested",
  "not-interested": "not-interested",
};

export function mapFeedbackToRejectionReason(feedbackType) {
  return FEEDBACK_TO_REJECTION[feedbackType] || "other";
}

export function isRejectionReason(value) {
  return REJECTION_REASONS.includes(value);
}

export function isAgeMismatchRejection(reason) {
  return reason === "too-young" || reason === "too-old";
}
