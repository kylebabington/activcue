/**
 * Age-fit retry steer — maps validator reason codes to actionable domain guidance.
 */

const INQUIRY_REASON_HINTS = {
  "older-inquiry-too-shallow":
    "The child must actually do the thinking: a real question or problem, then hands-on work, then a result they can explain. Do not only theme the activity as science/engineering.",
  "science-missing-test":
    "SCIENCE: the child must run a real test or observation (change one factor, try it, record what happens) — not draw a lab or pretend to be a scientist.",
  "science-missing-evidence":
    "SCIENCE: after the test, the child must compare results and explain what the evidence suggests.",
  "engineering-missing-constraint":
    "ENGINEERING: state a concrete constraint (limited materials, max tape, lightest structure, load to hold).",
  "engineering-missing-test":
    "ENGINEERING: include an observable test (weight held, distance traveled, whether it collapses).",
  "engineering-missing-iteration":
    "ENGINEERING: after the test, identify where it failed, change one feature, and retest.",
  "history-missing-evidence-reasoning":
    "HISTORY: start from a historical question, use broad well-established factors (no fake quotes), and have the child form and justify a claim.",
  "history-missing-causal-analysis":
    "HISTORY: ask the child to reason about causes, consequences, or different perspectives — not only decorate a poster.",
  "history-fabricated-source":
    "HISTORY SAFETY: do not invent quotations, diary entries, speeches, statistics, or fake documents. Use clearly framed summaries of well-established facts.",
  "oldest-role-cognitively-shallow":
    "The oldest child's childRole must include analysis, testing, evidence, hypothesis, comparison, or explanation — not only helping or watching.",
  "oldest-as-babysitter":
    "The oldest child must not supervise, babysit, or manage younger children. Give them a real investigative or design job.",
  "teen-pretend-story":
    "For ages 13+, do not invent an imaginary story world unless listed interests explicitly support fantasy, roleplay, fiction, game design, or worldbuilding.",
};

export function buildAgeFitRetrySteer({
  oldestAge,
  childAges,
  rejectionTitles,
  rejectedReasons = [],
} = {}) {
  const agesLabel =
    Array.isArray(childAges) && childAges.length > 0
      ? childAges.join(", ")
      : String(oldestAge ?? "unknown");
  const lines = [
    "AGE RETRY: The previous activity batch was rejected for age fit, maturity, developmental complexity, or inquiry quality.",
    `TARGET CHILD AGE(S): EXACTLY ${agesLabel}.`,
    "ageFit.minAge/maxAge must cover every participating child. targetAges should include the exact ages.",
  ];

  const uniqueReasons = [...new Set(rejectedReasons.filter(Boolean))];
  for (const reason of uniqueReasons) {
    if (INQUIRY_REASON_HINTS[reason]) {
      lines.push(INQUIRY_REASON_HINTS[reason]);
    }
  }

  if (Number.isFinite(oldestAge) && oldestAge >= 13) {
    lines.push(
      "This is a young teenager. Default to authentic real-world inquiry.",
      "Prefer scientific method, engineering iteration, historical causation, photography/documentation, design optimization, or independent investigation.",
      "Fictional worlds only when interests explicitly support fantasy, roleplay, fiction, game design, or worldbuilding.",
      "Reject decorative or pretend-only science/engineering roles."
    );
  } else if (Number.isFinite(oldestAge) && oldestAge >= 10) {
    lines.push(
      "This is an older-elementary / tween child. Default toward authentic investigations, engineering challenges, field observations, historical reasoning, or real-world creative production.",
      "Science = hypothesis, test, evidence. Engineering = constraints, test, redesign. History = evidence, causes, claim. Nature = observe, record, pattern, hypothesis.",
      "Avoid preschool fort/nursery framing and pretend jobs with no domain reasoning."
    );
  } else if (Number.isFinite(oldestAge) && oldestAge <= 7) {
    lines.push(
      "This is an early-elementary child. Instructions must be concrete and literal.",
      "Use short actions and limited choices. Maximum 4 scenes with 2–4 actions each.",
      "The child must never infer missing setup. Provide examples they can copy immediately.",
      "Avoid abstract planning, optimal sequences, and designing rules before beginning."
    );
  } else {
    lines.push(
      "Match maturityLevel to the child's age band. Keep directions concrete with modest planning.",
      "Allow classification, prediction, explanation, and simple pattern-finding."
    );
  }

  lines.push(
    "roleGuide.name must be activity-specific, never a generic one-word role.",
    "Write like a warm teacher: invitation → action → response."
  );

  if (rejectionTitles?.length > 0) {
    lines.push(
      `Rejected titles to avoid repeating: ${rejectionTitles
        .map((title) => `"${title}"`)
        .join(", ")}.`
    );
  }

  return lines.join("\n");
}
