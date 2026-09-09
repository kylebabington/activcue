import { getCognitiveInquiryProfile } from "./cognitiveInquiryProfile.js";

const ROLE_POOLS = {
  science: {
    older: [
      "Research Scientist",
      "Field Scientist",
      "Environmental Scientist",
      "Materials Scientist",
      "Ecologist",
      "Experimental Scientist",
    ],
    younger: ["Lab Helper", "Sample Sorter", "Observation Recorder"],
  },
  engineering: {
    older: [
      "Engineer",
      "Structural Engineer",
      "Mechanical Engineer",
      "Civil Engineer",
      "Design Engineer",
    ],
    younger: ["Materials Gatherer", "Builder", "Test Recorder"],
  },
  history: {
    older: [
      "Historian",
      "Historical Researcher",
      "Archaeology Researcher",
      "Museum Curator",
      "Historical Analyst",
    ],
    younger: ["Artifact Sorter", "Timeline Helper", "Exhibit Labeler"],
  },
  "natural-world": {
    older: [
      "Field Researcher",
      "Ecologist",
      "Naturalist",
      "Wildlife Researcher",
    ],
    younger: ["Field Collector", "Nature Noticer", "Sample Sorter"],
  },
  creative: {
    older: ["Design Lead", "Creative Director", "Photo Editor", "Composer"],
    younger: ["Maker", "Collector", "Display Helper"],
  },
  general: {
    older: ["Lead Investigator", "Project Designer", "Analyst"],
    younger: ["Field Observer", "Recorder", "Helper"],
  },
};

export function suggestDomainRoles({ domain = "general", age } = {}) {
  const n = Number(age);
  const pool = ROLE_POOLS[domain] || ROLE_POOLS.general;
  const older = !Number.isFinite(n) || n >= 10;
  return older ? pool.older : pool.younger;
}

export function formatDomainInquiryPromptBlock(oldestAge) {
  const profile = getCognitiveInquiryProfile(oldestAge);
  if (profile.inquiryDepth === "low") {
    return `
COGNITIVE WORK FOR THIS AGE:
Ask the child to ${profile.primaryThinking.join(", ")}.
Keep thinking concrete and hands-on. Do not assign teen-level analysis, variable control, or tradeoff optimization.
`.trim();
  }

  if (profile.band === "elementary") {
    return `
COGNITIVE WORK FOR AGES 8–9:
Ask the child to classify, predict, explain, compare evidence, and find simple patterns.
The child should make a simple claim from what they observe — not a full lab report.
`.trim();
  }

  const teenRule =
    profile.fictionPolicy === "interests-only"
      ? `
AGES 13+ FICTION RULE:
Real-world inquiry is the default.
Use an imaginary story world ONLY when listed interests explicitly include fantasy, roleplay, fiction, storytelling, game design, gaming, or worldbuilding.
Even then, the child must still do substantive thinking (design, analysis, iteration). Game design is acceptable. Nursery pretend play is not.
`.trim()
      : `
AGES 10–12 FICTION RULE:
Default to authentic investigations, engineering challenges, field observations, historical reasoning, or real-world creative production.
Avoid childish fantasy and "pretend you are a scientist" with no actual scientific thinking.
Light theme is optional; the work must be real.
`.trim();

  return `
COGNITIVE WORK (hard — this is not homework, but the child must think):
Primary thinking: ${profile.primaryThinking.join(", ")}.
Do not turn this into a worksheet. Keep it fun, independent, exploratory, and hands-on.
Photography, cooking, music, game design, creative work, and outdoor exploration are valid when they include real decisions, constraints, comparison, evidence, testing, iteration, critique, or explanation.
Do NOT force the scientific method onto every non-science activity.

SCIENCE cycle (when science is the primary domain):
QUESTION → PREDICTION/HYPOTHESIS → TEST → OBSERVE/MEASURE → COMPARE → EXPLAIN
The child must change one meaningful factor when possible, observe or measure, compare, and explain what the evidence suggests.
Reject decorative science: pretending to be in a lab, drawing a lab, naming imaginary chemicals.

ENGINEERING cycle (when engineering is the primary domain):
PROBLEM → CONSTRAINTS → DESIGN → BUILD → TEST → IDENTIFY FAILURE → REDESIGN
The child needs a concrete goal, a constraint, an observable test, a failure/result, one changed feature, and a retest.
Reject "just build something" or "draw a blueprint" with no test.

HISTORY cycle (when history is the primary domain):
QUESTION → EVIDENCE/FACTORS → PERSPECTIVES OR CAUSES → CLAIM → JUSTIFICATION
Use only broad well-established facts and clearly framed summaries.
HARD SAFETY: do not invent historical quotations, diary entries, speeches, statistics, or fake documents.

NATURAL-WORLD cycle (field/nature inquiry):
OBSERVE → RECORD → COMPARE → FIND PATTERN → HYPOTHESIZE → LOOK FOR SUPPORTING EVIDENCE
Prefer screen-free outdoor or household observation.

AUTHENTIC ROLE TITLES for ages 10+ (use when they fit; do not force into every activity):
Science: Research Scientist, Field Scientist, Environmental Scientist, Materials Scientist, Ecologist, Experimental Scientist
Engineering: Engineer, Structural Engineer, Mechanical Engineer, Civil Engineer, Design Engineer
History: Historian, Historical Researcher, Archaeology Researcher, Museum Curator, Historical Analyst
Nature: Field Researcher, Ecologist, Naturalist, Wildlife Researcher
Avoid inflated fake titles (Ultimate Science Commander, Master Engineering Hero, Legendary History Detective).

${teenRule}
`.trim();
}

export function formatMixedAgeCognitiveRoleRules() {
  return `
MIXED-AGE COGNITIVE ROLES (hard):
Match each childRole to that child's cognitive expectations in the design brief.
Younger children: concrete jobs (gather, sort, describe, record visible traits).
Older children (10+): analysis, planning, testing, evidence, hypothesis, comparison, or explanation.
The older child's role must change the outcome. They must not only supervise, help, manage, watch, or read directions aloud.
`.trim();
}
