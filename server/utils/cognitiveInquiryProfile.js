/**
 * Cognitive / inquiry age profile — second age dimension.
 * Complexity budget answers "how complicated can instructions be?"
 * This answers "what kind of thinking should this child be doing?"
 */

const FICTION_INTEREST_PATTERN =
  /\b(fantasy|role[- ]?play|roleplay|fiction|storytelling|story[- ]?telling|game[- ]?design|gaming|video[- ]?games?|world[- ]?building|worldbuilding|dungeons|rpg|make[- ]?believe|creative writing|narrative|fanfic|cosplay)\b/i;

const PROFILES = {
  preschool: {
    band: "preschool",
    ageRange: [3, 5],
    primaryThinking: [
      "notice",
      "imitate",
      "sort",
      "name",
      "simple-cause-effect",
      "simple-sensory-comparison",
    ],
    framingDefault: "imaginative",
    fictionPolicy: "allowed",
    inquiryDepth: "low",
  },
  "early-elementary": {
    band: "early-elementary",
    ageRange: [6, 7],
    primaryThinking: [
      "observe",
      "compare",
      "sequence",
      "simple-prediction",
      "describe-cause-effect",
      "follow-concrete-procedures",
    ],
    framingDefault: "imaginative",
    fictionPolicy: "allowed",
    inquiryDepth: "low",
  },
  elementary: {
    band: "elementary",
    ageRange: [8, 9],
    primaryThinking: [
      "classify",
      "predict",
      "explain",
      "compare-evidence",
      "identify-simple-patterns",
      "make-simple-claims-from-observations",
    ],
    framingDefault: "imaginative",
    fictionPolicy: "optional",
    inquiryDepth: "moderate",
  },
  "older-elementary": {
    band: "older-elementary",
    ageRange: [10, 12],
    primaryThinking: [
      "hypothesize",
      "test",
      "measure",
      "infer",
      "identify-variables",
      "compare-competing-explanations",
      "reason-about-constraints",
      "explain-cause-effect-with-evidence",
    ],
    framingDefault: "authentic-inquiry",
    fictionPolicy: "optional",
    inquiryDepth: "high",
  },
  teen: {
    band: "teen",
    ageRange: [13, 18],
    primaryThinking: [
      "analyze-evidence",
      "control-variables",
      "evaluate-explanations",
      "optimize-designs",
      "reason-about-tradeoffs",
      "identify-bias-or-uncertainty",
      "support-claims",
      "redesign-based-on-failure",
      "distinguish-correlation-from-causation",
    ],
    framingDefault: "authentic-inquiry",
    fictionPolicy: "interests-only",
    inquiryDepth: "rigorous",
  },
};

export function getCognitiveInquiryBand(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 5) return "preschool";
  if (n <= 7) return "early-elementary";
  if (n <= 9) return "elementary";
  if (n <= 12) return "older-elementary";
  return "teen";
}

export function getCognitiveInquiryProfile(age) {
  const band = getCognitiveInquiryBand(age);
  const profile = PROFILES[band];
  return {
    ...profile,
    age: Number.isFinite(Number(age)) ? Number(age) : null,
  };
}

export function interestsSupportFiction(childrenContext = []) {
  const children = Array.isArray(childrenContext) ? childrenContext : [];
  for (const child of children) {
    const blobs = [];
    if (typeof child?.interests === "string") blobs.push(child.interests);
    if (Array.isArray(child?.interests)) blobs.push(...child.interests);
    if (typeof child?.notes === "string") blobs.push(child.notes);
    const text = blobs.filter(Boolean).join(" ");
    if (text && FICTION_INTEREST_PATTERN.test(text)) {
      return true;
    }
  }
  return false;
}

export function formatCognitiveExpectationsForBrief(age) {
  const profile = getCognitiveInquiryProfile(age);
  return {
    band: profile.band,
    primaryThinking: profile.primaryThinking,
    framingDefault: profile.framingDefault,
    fictionPolicy: profile.fictionPolicy,
    inquiryDepth: profile.inquiryDepth,
  };
}
