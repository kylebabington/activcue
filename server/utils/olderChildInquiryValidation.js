/**
 * Older-child inquiry quality — structural, domain-aware.
 * Keywords may hint at a beat; the child must still perform the reasoning
 * in story / sceneSetup / actions[] / doneWhen / sceneOutcome / finishGuide.
 */

const ACTION_FIELDS = new Set(["action", "doneWhen", "instruction"]);
const RESULT_FIELDS = new Set(["doneWhen", "sceneOutcome", "finish", "action"]);
const SETUP_FIELDS = new Set(["story", "summary", "sceneSetup", "role"]);

const PATTERNS = {
  question: [
    /\b(which|why|what|does|do|how)\b.{0,80}\?/,
    /\b(question|investigate whether|find out whether|determine which)\b/i,
  ],
  prediction: [
    /\b(predict|prediction|hypothes[ei]s|i think .{0,40} will|guess whether)\b/i,
  ],
  test: [
    /\b(tests?|trials?|try|tries|run .{0,20}(again|twice|three)|time how|times how|measure|drop|pour|mix|compare .{0,20}(results?|times|distance|weight))\b/i,
  ],
  observeMeasure: [
    /\b(observe|watch|records?|write down|tally|count|measure|time|weigh|photograph|note)\b/i,
  ],
  compare: [
    /\b(compares?|faster|slower|more than|less than|which .{0,30} (won|held|went farther|dissolved)|versus|vs\.?)\b/i,
  ],
  explain: [
    /\b(explains?|because|evidence (shows|suggests)|this (suggests|means)|conclude|conclusion|justify|defend)\b/i,
  ],
  constraint: [
    /\b(only|limit(?:ed)?|constraint|using (two|2|three|3) |no more than|least material|as little|budget|must (be|use|hold|weigh))\b/i,
  ],
  build: [
    /\b(build|fold|tape|construct|assemble|make the|stack|attach)\b/i,
  ],
  failure: [
    /\b(fail|broke|break|collapse|collapse[ds]?|bent|tore|weak(?:est)?|did not hold|gave way|failure point|where it failed)\b/i,
  ],
  modify: [
    /\b(change (one|a|the)|redesign|rebuild|replace|try a different|modify|adjust|fold differently|add (one|a) )\b/i,
  ],
  retest: [
    /\b(retest|test again|try again|run (it )?again|second trial|compare (the )?new)\b/i,
  ],
  evidence: [
    /\b(evidence|factor[s]?|reason[s]?|source|because|based on)\b/i,
  ],
  causal: [
    /\b(cause|caused|consequence|led to|why .{0,40} (happen|develop|fail)|most important factor|contribut)\b/i,
  ],
  claim: [
    /\b(ranks?|choose which|chooses?|claim|argue|most important|I (think|would say)|decide which)\b/i,
  ],
  justify: [
    /\b(justif(?:y|ies)|because|defend|support (your|the) (rank|claim|choice)|evidence for)\b/i,
  ],
  perspective: [
    /\b(perspective|different groups|how .{0,20} (felt|experienced)|point of view)\b/i,
  ],
  pattern: [
    /\b(pattern|variation|difference[s]? between|alike|similar)\b/i,
  ],
  decision: [
    /\b(chooses?|decides?|pick (which|the)|selects?)\b/i,
  ],
  critique: [
    /\b(critique|what (worked|failed)|improve|stronger|weaker shot|best (take|version))\b/i,
  ],
  optimize: [
    /\b(optimize|trade[- ]?off|least|most .{0,20} with|efficiency|better ratio)\b/i,
  ],
  decorativeScience: [
    /\b(hidden lab|secret lab|pretend .{0,20} scientist|draw .{0,20}(lab|beaker)|decorate .{0,20} science)\b/i,
  ],
  decorativeEngineering: [
    /\b(design a cool room|draw a blueprint|make a tower)\b/i,
  ],
  fabricatedHistory: [
    /\b(diary entry|primary source|according to (this )?fake|invented (quote|speech)|the (king|pharaoh|president) (said|wrote) [“"])\b/i,
    /\b(quote|quotation|speech) (from|by) .{0,30} that (you|we) (made|invent|write)\b/i,
  ],
};

function asText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean).join(" ");
  }
  return "";
}

function categoriesOf(activity) {
  const raw = Array.isArray(activity?.categories) ? activity.categories : [];
  return raw.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean);
}

function activityHaystack(activity) {
  return [
    activity?.title,
    activity?.summary,
    activity?.story,
    activity?.theme,
    activity?.mission,
    activity?.roleGuide?.name,
    activity?.roleGuide?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Deterministic primary domain for inquiry validation. Not persisted.
 */
export function resolvePrimaryInquiryDomain(activity) {
  const cats = categoriesOf(activity);
  const text = activityHaystack(activity);

  if (cats.includes("engineering")) return "engineering";
  if (cats.includes("history")) return "history";

  const hasScience = cats.includes("science");
  const hasNature = cats.includes("nature");
  if (hasScience && hasNature) {
    if (
      /\b(experiment|trial|dissolv|variable|ramp angle|helicopter|hypothesis)\b/i.test(
        text
      )
    ) {
      return "science";
    }
    return "natural-world";
  }
  if (hasScience) return "science";
  if (hasNature) return "natural-world";

  if (cats.includes("creative") || cats.includes("music") || cats.includes("reading")) {
    return "creative";
  }

  if (/\b(engineer|load test|cantilever|redesign|prototype|paper bridge|paper tower)\b/i.test(text)) {
    return "engineering";
  }
  if (/\b(histor|ancient|civilization|titanic|migration|museum curator)\b/i.test(text)) {
    return "history";
  }
  if (/\b(experiment|hypothesis|dissolve|variable)\b/i.test(text)) {
    return "science";
  }
  if (/\b(leaf|bird|soil|insect|cloud|erosion|ecology|wildlife)\b/i.test(text)) {
    return "natural-world";
  }

  return "general";
}

function collectOrderedBeats(activity) {
  const beats = [];
  const push = (stage, field, text) => {
    const value = asText(text);
    if (value) beats.push({ stage, field, text: value });
  };

  push(0, "story", activity?.story);
  push(0, "summary", activity?.summary);
  push(0, "role", [
    activity?.roleGuide?.name,
    activity?.roleGuide?.description,
    ...(Array.isArray(activity?.roleGuide?.childRoles)
      ? activity.roleGuide.childRoles.flatMap((role) => [
          role?.roleTitle,
          role?.responsibility,
          role?.firstAction,
        ])
      : []),
  ]);

  const steps = Array.isArray(activity?.stepDetails) ? activity.stepDetails : [];
  steps.forEach((step, index) => {
    const stage = index + 1;
    push(stage, "sceneSetup", step?.sceneSetup);
    const actions = Array.isArray(step?.actions) ? step.actions : [];
    for (const action of actions) {
      push(stage, "action", action);
    }
    push(stage, "instruction", step?.instruction);
    push(stage, "doneWhen", step?.doneWhen);
    push(stage, "sceneOutcome", step?.sceneOutcome);
  });

  const finish = activity?.finishGuide || {};
  push(steps.length + 1, "finish", [
    finish.resolution,
    finish.action,
    finish.doneWhen,
    finish.example,
  ]);

  return beats;
}

function matchesAny(text, patterns) {
  if (!text) return false;
  return patterns.some((pattern) => pattern.test(text));
}

function firstStage(beats, patterns, fieldSet = null) {
  for (const beat of beats) {
    if (fieldSet && !fieldSet.has(beat.field)) continue;
    if (matchesAny(beat.text, patterns)) return beat.stage;
  }
  return null;
}

function hasAfter(beats, minStage, patterns, fieldSet = null) {
  if (!Number.isFinite(minStage)) return false;
  return beats.some((beat) => {
    if (beat.stage < minStage) return false;
    if (fieldSet && !fieldSet.has(beat.field)) return false;
    return matchesAny(beat.text, patterns);
  });
}

function hasIn(beats, patterns, fieldSet = null) {
  return firstStage(beats, patterns, fieldSet) != null;
}

function oldestAgeFromContext(childrenContext, activity) {
  const ages = (Array.isArray(childrenContext) ? childrenContext : [])
    .map((child) => Number(child?.ageYears ?? child?.age))
    .filter((age) => Number.isFinite(age));
  if (ages.length > 0) return Math.max(...ages);

  const targets = Array.isArray(activity?.ageFit?.targetAges)
    ? activity.ageFit.targetAges.map(Number).filter(Number.isFinite)
    : [];
  if (targets.length > 0) return Math.max(...targets);
  const maxAge = Number(activity?.ageFit?.maxAge ?? activity?.age_max);
  return Number.isFinite(maxAge) ? maxAge : null;
}

function validateScienceArc(beats, depth) {
  const reasons = [];
  if (hasIn(beats, PATTERNS.decorativeScience, SETUP_FIELDS) && !hasIn(beats, PATTERNS.test, ACTION_FIELDS)) {
    reasons.push("science-missing-test");
    reasons.push("older-inquiry-too-shallow");
    return reasons;
  }

  const questionStage = firstStage(beats, [...PATTERNS.question, ...PATTERNS.prediction], SETUP_FIELDS)
    ?? firstStage(beats, [...PATTERNS.question, ...PATTERNS.prediction]);
  const testStage = firstStage(beats, PATTERNS.test, ACTION_FIELDS);
  const observeStage = firstStage(beats, PATTERNS.observeMeasure, ACTION_FIELDS)
    ?? firstStage(beats, PATTERNS.observeMeasure, RESULT_FIELDS);

  if (testStage == null) {
    reasons.push("science-missing-test");
  }
  if (questionStage == null && depth === "rigorous") {
    reasons.push("older-inquiry-too-shallow");
  }

  const compareOk =
    observeStage != null &&
    hasAfter(beats, Math.max(testStage ?? 0, observeStage ?? 0), PATTERNS.compare);
  const explainOk = hasIn(beats, PATTERNS.explain, new Set(["action", "finish", "sceneOutcome", "doneWhen"]));
  const evidenceOk = compareOk || explainOk || hasIn(beats, PATTERNS.evidence, RESULT_FIELDS);

  if (!evidenceOk) {
    reasons.push("science-missing-evidence");
  }

  if (depth === "rigorous") {
    if (testStage == null || observeStage == null || !compareOk || !explainOk) {
      if (!reasons.includes("older-inquiry-too-shallow")) {
        reasons.push("older-inquiry-too-shallow");
      }
    }
  } else if (testStage == null && !evidenceOk) {
    reasons.push("older-inquiry-too-shallow");
  }

  return [...new Set(reasons)];
}

function validateEngineeringArc(beats, depth) {
  const reasons = [];
  const constraintOk = hasIn(beats, PATTERNS.constraint, SETUP_FIELDS) || hasIn(beats, PATTERNS.constraint);
  const buildStage = firstStage(beats, PATTERNS.build, ACTION_FIELDS);
  const testStage = firstStage(beats, PATTERNS.test, ACTION_FIELDS)
    ?? firstStage(beats, PATTERNS.test, RESULT_FIELDS);
  const failureOk = hasIn(beats, PATTERNS.failure, RESULT_FIELDS) || hasIn(beats, PATTERNS.failure, ACTION_FIELDS);
  const modifyStage = firstStage(beats, PATTERNS.modify, ACTION_FIELDS);
  const retestOk =
    modifyStage != null &&
    hasAfter(beats, modifyStage, [...PATTERNS.retest, ...PATTERNS.test], ACTION_FIELDS);

  if (!constraintOk) reasons.push("engineering-missing-constraint");
  if (testStage == null) reasons.push("engineering-missing-test");
  if (modifyStage == null || !retestOk) {
    reasons.push("engineering-missing-iteration");
  }

  if (buildStage == null && testStage == null) {
    reasons.push("older-inquiry-too-shallow");
  }

  if (depth === "rigorous" && (!constraintOk || testStage == null || !failureOk || !retestOk)) {
    reasons.push("older-inquiry-too-shallow");
  }

  if (
    hasIn(beats, PATTERNS.decorativeEngineering) &&
    (testStage == null || !constraintOk)
  ) {
    reasons.push("older-inquiry-too-shallow");
  }

  return [...new Set(reasons)];
}

function validateHistoryArc(beats) {
  const reasons = [];
  if (hasIn(beats, PATTERNS.fabricatedHistory)) {
    reasons.push("history-fabricated-source");
  }

  const questionOk = hasIn(beats, PATTERNS.question, SETUP_FIELDS) || hasIn(beats, PATTERNS.question);
  const evidenceOk = hasIn(beats, PATTERNS.evidence);
  const causalOk = hasIn(beats, PATTERNS.causal) || hasIn(beats, PATTERNS.perspective);
  const claimOk = hasIn(beats, PATTERNS.claim, ACTION_FIELDS) || hasIn(beats, PATTERNS.claim, new Set(["finish", "sceneOutcome"]));
  const justifyOk = hasIn(beats, PATTERNS.justify, ACTION_FIELDS) || hasIn(beats, PATTERNS.justify, new Set(["finish"]));

  if (!evidenceOk || !questionOk) {
    reasons.push("history-missing-evidence-reasoning");
  }
  if (!causalOk) {
    reasons.push("history-missing-causal-analysis");
  }
  if (!claimOk || !justifyOk) {
    reasons.push("history-missing-evidence-reasoning");
    reasons.push("older-inquiry-too-shallow");
  }

  return [...new Set(reasons)];
}

function validateNaturalWorldArc(beats, depth) {
  const reasons = [];
  const observeOk = hasIn(beats, PATTERNS.observeMeasure, ACTION_FIELDS);
  const recordOk = hasIn(beats, PATTERNS.observeMeasure);
  const compareOk = hasIn(beats, PATTERNS.compare) || hasIn(beats, PATTERNS.pattern);
  const hypoOk = hasIn(beats, PATTERNS.prediction) || hasIn(beats, PATTERNS.explain);

  if (!observeOk) reasons.push("older-inquiry-too-shallow");
  if (!recordOk || !compareOk) reasons.push("science-missing-evidence");
  if (depth === "rigorous" && !hypoOk) reasons.push("older-inquiry-too-shallow");
  return [...new Set(reasons)];
}

function validateGeneralArc(beats, depth) {
  const signals = [
    hasIn(beats, PATTERNS.decision, ACTION_FIELDS),
    hasIn(beats, PATTERNS.constraint),
    hasIn(beats, PATTERNS.compare, ACTION_FIELDS) || hasIn(beats, PATTERNS.compare, RESULT_FIELDS),
    hasIn(beats, PATTERNS.test, ACTION_FIELDS),
    hasIn(beats, PATTERNS.modify, ACTION_FIELDS),
    hasIn(beats, PATTERNS.critique, ACTION_FIELDS) || hasIn(beats, PATTERNS.explain, ACTION_FIELDS),
    hasIn(beats, PATTERNS.optimize),
    hasIn(beats, PATTERNS.explain, new Set(["action", "finish", "sceneOutcome"])),
  ].filter(Boolean).length;

  const needed = depth === "rigorous" ? 3 : 2;
  if (signals < needed) {
    return ["older-inquiry-too-shallow"];
  }
  return [];
}

export function childrenContextFromAgeFit(activity) {
  const oldest = oldestAgeFromContext([], activity);
  if (!Number.isFinite(oldest) || oldest < 10) return [];
  return [{ name: "Child 1", ageYears: oldest }];
}

/**
 * @returns {{ ok: boolean, reasons: string[], domain: string, oldestAge: number|null }}
 */
export function validateOlderChildInquiryQuality(activity, childrenContext = []) {
  const oldestAge = oldestAgeFromContext(childrenContext, activity);
  if (!Number.isFinite(oldestAge) || oldestAge < 10) {
    return { ok: true, reasons: [], domain: null, oldestAge };
  }

  const domain = resolvePrimaryInquiryDomain(activity);
  const depth = oldestAge >= 13 ? "rigorous" : "high";
  const beats = collectOrderedBeats(activity);

  let reasons = [];
  if (domain === "science") {
    reasons = validateScienceArc(beats, depth);
  } else if (domain === "engineering") {
    reasons = validateEngineeringArc(beats, depth);
  } else if (domain === "history") {
    reasons = validateHistoryArc(beats);
  } else if (domain === "natural-world") {
    reasons = validateNaturalWorldArc(beats, depth);
  } else {
    reasons = validateGeneralArc(beats, depth);
  }

  return {
    ok: reasons.length === 0,
    reasons,
    domain,
    oldestAge,
  };
}
