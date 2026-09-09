import { getPolicyAgeBand, getDevelopmentalComplexityBudget } from "./activityAgePolicy.js";
import { formatCognitiveExpectationsForBrief } from "./cognitiveInquiryProfile.js";

function sanitizeChildForBrief(child, index) {
  const ageYears = Number(child?.ageYears ?? child?.age);
  const age = Number.isFinite(ageYears) ? ageYears : null;
  return {
    label: `Child ${index + 1}`,
    age,
    ageBand: child?.ageBand || (Number.isFinite(ageYears) ? getPolicyAgeBand(ageYears) : "unknown"),
    interests: Array.isArray(child?.interests) ? child.interests : [],
    avoids: Array.isArray(child?.avoids) ? child.avoids : [],
    independence: child?.independenceLevel || "usually-independent",
    cognitive: Number.isFinite(age) ? formatCognitiveExpectationsForBrief(age) : null,
  };
}

/**
 * Compact authoritative participant + design brief for AI input (no PII).
 */
export function buildActivityDesignBrief({
  childrenContext = [],
  groupAgeContext = {},
  activityMode = "single-child",
  activityStyle = "imaginative",
} = {}) {
  const children = (Array.isArray(childrenContext) ? childrenContext : [])
    .map(sanitizeChildForBrief)
    .filter((child) => Number.isFinite(child.age));

  const ages = children.map((c) => c.age);
  const participantCount = ages.length || 1;
  const resolvedMode =
    participantCount >= 2 ? "family" : activityMode || "single-child";

  const youngest =
    ages.length > 0
      ? Math.min(...ages)
      : Number.isFinite(Number(groupAgeContext?.youngestAge))
        ? Number(groupAgeContext.youngestAge)
        : null;
  const oldest =
    ages.length > 0
      ? Math.max(...ages)
      : Number.isFinite(Number(groupAgeContext?.oldestAge))
        ? Number(groupAgeContext.oldestAge)
        : null;

  const complexityBudget = getDevelopmentalComplexityBudget(
    youngest,
    activityStyle
  );

  const requiredRoleCount = participantCount >= 2 ? participantCount : 0;

  const narrativeDesign = {
    mode: resolveNarrativeDesignMode({
      activityStyle,
      youngestAge: youngest,
      oldestAge: oldest,
    }),
    requiresIncitingIncident: activityStyle === "imaginative",
    requiresSceneSetup: activityStyle === "imaginative",
    requiresSceneOutcome: activityStyle === "imaginative",
    requiresCausalTransitions: activityStyle === "imaginative",
    finalSceneResolvesOpeningProblem: activityStyle === "imaginative",
  };

  return {
    participants: {
      count: participantCount,
      mode: resolvedMode,
      children,
    },
    groupDesign: {
      directionsMustWorkForAge: youngest,
      engagementMustWorkForAge: oldest,
      requiredRoleCount,
      roleRule:
        requiredRoleCount >= 2
          ? "Both children actively contribute; neither child only supervises."
          : "Single child completes every required action alone.",
    },
    complexityBudget,
    narrativeDesign,
    cognitiveDesign: {
      byChild: children.map((child) => ({
        label: child.label,
        age: child.age,
        ...child.cognitive,
      })),
      oldest: Number.isFinite(oldest)
        ? formatCognitiveExpectationsForBrief(oldest)
        : null,
      note:
        "Match each childRole to that child's primaryThinking. Complexity budget is separate from thinking type.",
    },
  };
}

export function resolveNarrativeDesignMode({
  activityStyle = "imaginative",
  youngestAge = null,
  oldestAge = null,
} = {}) {
  if (activityStyle === "simple") {
    return "practical-progression";
  }
  const oldest = Number.isFinite(Number(oldestAge)) ? Number(oldestAge) : null;
  const youngest = Number.isFinite(Number(youngestAge)) ? Number(youngestAge) : null;
  const focusAge = oldest ?? youngest;
  if (!Number.isFinite(focusAge)) {
    return "causal-adventure";
  }
  if (focusAge >= 13) {
    return "challenge-progression";
  }
  if (focusAge >= 10) {
    return "causal-challenge";
  }
  return "causal-adventure";
}

export function formatActivityDesignBriefForPrompt(brief) {
  return JSON.stringify(brief, null, 2);
}
