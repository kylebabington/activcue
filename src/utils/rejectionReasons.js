// src/utils/rejectionReasons.js

export const REJECTION_REASONS = Object.freeze([
  "not-interested",
  "too-hard",
  "too-messy",
  "too-loud",
  "missing-supplies",
  "needs-too-much-help",
  "wrong-mood",
  "already-did-it",
  "other",
]);

const FEEDBACK_TO_REJECTION = {
  "too-messy": "too-messy",
  "too-hard": "too-hard",
  "need-quieter": "too-loud",
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
