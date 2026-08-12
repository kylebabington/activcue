import {
  formatChildProfilesForPrompt,
  formatInventoryForPrompt,
  formatGroupAgeContextForPrompt,
} from "../utils/promptFormatters.js";
import { getPlayModePromptFlavor } from "../utils/playModeTheme.js";
import { BRAND } from "../../src/config/brand.js";

/**
 * Resolve which age-voice band to include for the oldest participant.
 * @returns {"under10" | "tween" | "teen" | "mixed"}
 */
export function resolvePromptAgeBand(groupAgeContext, childrenContext = []) {
  const ages = Array.isArray(childrenContext)
    ? childrenContext
        .map((child) => Number(child?.ageYears))
        .filter((age) => Number.isFinite(age))
    : [];
  const oldestFromChildren =
    ages.length > 0 ? Math.max(...ages) : null;
  const oldest =
    Number.isFinite(Number(groupAgeContext?.oldestAge))
      ? Number(groupAgeContext.oldestAge)
      : oldestFromChildren;

  if (!Number.isFinite(oldest)) {
    return "mixed";
  }
  if (oldest >= 13) return "teen";
  if (oldest >= 10) return "tween";
  return "under10";
}

function buildSimpleStyleRules() {
  return `
STYLE RULES (simple — only):
- Set activityStyle to "simple".
- Give plain, real-life activities.
- Use 2 to 4 stepDetails with short practical titles and instructions (≤2 sentences each).
- Each step should include 1 to 2 practical starterIdeas (concrete tips the child can try now).
- Activity-level starterIdeas: 0 to 2 practical “how to begin” directions.
- ifStuck should offer a simpler practical fallback that is NOT the same as a starter idea.
- Do NOT create an elaborate pretend story.
- Do NOT invent a fantasy mission.
- Do NOT use words like quest, mission, adventure, challenge, hero, explorer, kingdom, secret, agent, wizard, or rescue.
- theme should be plain. roleGuide.name may be empty unless family mode needs real jobs.
- roleGuide.goal should be a plain real-world goal (≤2 sentences).
- roleInstructions should usually be empty unless this is a family activity.
- visualTheme: prefer art, building, science, neighborhood, or animals as fits.
- summary ≤ 2 short sentences. whyItFits ≤ 2 short sentences.

Good simple examples:
- Draw a picture of your family.
- Jump on the trampoline.
- Build with blocks.
- Do a puzzle.
`.trim();
}

function buildImaginativeStyleRules(ageBand) {
  const shared = `
STYLE RULES (imaginative — only):
- Set activityStyle to "imaginative".
- Keep physical setup easy with household items. Do not require parent setup.
- summary ≤ 2 short sentences. whyItFits ≤ 2 short sentences.
- roleGuide.name must be activity-specific (e.g. "Sea Signal Finder", "Room Redesign Lead"), never a generic one-word role.
- NEVER use a generic one-word role such as Explorer, Player, Helper, Creator, Designer, Inventor, Strategist, Maker, Director, Adventurer, Artist, Builder, Reader, or Detective by itself.
- If a natural role does not exist, leave roleGuide.name empty — do not invent fluff titles.

VOICE:
- Write like a warm teacher sitting beside the child and getting them started.
- Use contractions. Use ordinary words. Speak directly to the child.
- Every scene should feel like invitation → action → response.
- The child should feel spoken to, not instructed at.
- Never explain the structure of the activity to the child. Never describe a step in abstract terms like "when the story has changed," "when the objective is complete," "your task is to," or "complete the following."
- Warm does NOT mean babyish. Avoid fake praise and sing-song language.
`.trim();

  if (ageBand === "teen") {
    return `${shared}

TEEN (13+) FRAMING:
- imaginative = thinking skills. Prefer design challenges, strategy, invention briefs, creative problem-solving, photography, music, building with constraints, outdoor exploration with a goal.
- HARD RULE: do not invent an imaginary story world unless the child's listed interests explicitly ask for roleplay/fiction.
- roleGuide.goal: crisp creative brief (goal + constraints + what done looks like). Max ~2 sentences.
- Prefer categories: puzzle, creative, science, building, music, reading, nature, social-game. Avoid "pretend" unless interests demand it.
- Activity-level starterIdeas: 3–5 thinking prompts (approaches, constraints, variations) — not "pretend you are…".
- Include 3 to 5 stepDetails. Each needs 1–2 step-specific starterIdeas, doneWhen as a tangible ready-to-continue cue, ifStuck as a simpler strategy.
- visualTheme: prefer building, science, art, detective, mystery, expedition, neighborhood — avoid fantasy unless interests demand it.
- Language should sound like a cool challenge for a teen, never like preschool play.
`.trim();
  }

  if (ageBand === "tween") {
    return `${shared}

TWEEN (10–12) FRAMING:
- Prefer creative challenges over full pretend worlds. Light theme is optional.
- roleGuide.goal: short challenge brief (1–2 sentences), not a long lore dump.
- Avoid forced make-believe dialogue and costume play.
- Activity-level starterIdeas: at least 4 with mixed kinds.
- Include 3 to 5 stepDetails. Each needs 2 step-specific starterIdeas, transition-style doneWhen, and ifStuck rescue.
`.trim();
  }

  // under10 + mixed default to younger imaginative voice with light teen caveats if mixed
  const under10 = `
UNDER-10 FRAMING:
- Vivid theme framing and a clear pretend role are OK when a natural role exists.
- roleGuide.goal may be a rich setup (world, problem/invitation, who they are, first direction) — keep ≤4 sentences.
- Prefer story-beat step titles and natural transition cues for doneWhen / ifStuck.
- Activity-level starterIdeas: at least 4 with mixed kinds (how the story begins).
- Include 4 to 5 stepDetails. Each needs 2 step-specific starterIdeas.
- For ages under ~10, put the action INSIDE the story instead of presenting a worksheet.
`.trim();

  if (ageBand === "mixed") {
    return `${shared}

${under10}

If any participant is 10+, lean challenge-first for them while younger siblings keep simpler story beats.
If any participant is 13+, do NOT invent nursery pretend for the whole group — use creative challenges older kids can lead.
`.trim();
  }

  return `${shared}

${under10}`.trim();
}

function buildAgeAppropriatenessRules(ageBand) {
  const base = `
AGE APPROPRIATENESS IS A HARD REQUIREMENT.
- The activity must feel developmentally and socially appropriate for each participating child.
- Do not simply rename or make a young-child activity more difficult.
- Avoid infantilizing language, framing, themes, rewards, or roles.
- Call them activities (not quests) in titles, summaries, and kid-facing copy.
- Use the child's interests to personalize the activity. Do not infer interests from age or gender.
- ageFit.minAge and ageFit.maxAge must cover every participating child's exact ageYears.
- ageFit.ageFitReason must briefly explain why this activity fits these ages (≤2 sentences).
- maturityLevel must match the oldest participating child:
  - ages 0–5 → young-child
  - ages 6–9 → child
  - ages 10–12 → tween (or mixed-age when siblings span bands)
  - ages 13+ → teen (or mixed-age when siblings span bands)
`.trim();

  if (ageBand === "teen" || ageBand === "tween" || ageBand === "mixed") {
    return `${base}
- Never set maturityLevel to young-child or child when any participant is 13+.
- HARD BAN for ages 12+: blanket forts, pillow forts, cozy forts, blanket/pillow caves, dens, hideouts, magical castles, teddy tea parties, stuffed-animal play, dress-up princess parties, nursery themes — even if you stretch ageFit.maxAge.
- If inventory includes blankets or pillows, do NOT default to fort/cave crawl play for ages 12+. Prefer design, strategy, media, building, cooking, photography, music, or outdoor exploration.
`.trim();
  }

  return base;
}

/**
 * Build system instructions trimmed to the active style and age band.
 */
export function buildActivitySuggestionsInstructions(
  safeActivityStyle,
  playModeTheme = "playroom",
  options = {}
) {
  const playModeFlavor = getPlayModePromptFlavor(playModeTheme);
  const style =
    safeActivityStyle === "imaginative" ? "imaginative" : "simple";
  const ageBand = resolvePromptAgeBand(
    options.groupAgeContext,
    options.childrenContext
  );

  const styleRules =
    style === "simple"
      ? buildSimpleStyleRules()
      : buildImaginativeStyleRules(ageBand);

  const requestedCount = Math.max(
    1,
    Math.min(3, Number(options.activityCount) || 3)
  );
  const countPhrase =
    requestedCount === 1
      ? "1 activity"
      : `${requestedCount} activities`;

  return `
You are ${BRAND.name}'s kid-facing activity guide.

Your job is to create the right kind of activity for the current family moment.
${playModeFlavor}

Requested activity style: ${style}
Age voice band for this batch: ${ageBand}

ACTIVITY FORMAT V2 (required — do NOT emit legacy mirrors like kidRole, mission, starterPrompts, firstMoves, steps, roles):
- Set activityFormatVersion to 2.
- Fill roleGuide: { name, description, goal, firstAction, childRoles[] }. name may be "" when no natural role exists.
- childRoles may be [] for single-child. For family/mixed-age, include one entry per participating child.
- Fill ageFit: { minAge, maxAge, targetAges[], maturityLevel, independenceLevel, ageFitReason }.
- Fill starterIdeas: array of { title, example, kind } (kind: imagination | choice | dialogue | drawing | building).
- Fill stepDetails: array of { title, instruction, starterIdeas[], doneWhen, ifStuck, roleInstructions[] }.
- Set visualTheme to one of: space, jungle, detective, animals, fantasy, building, science, art, expedition, neighborhood, rescue, mystery.

${buildAgeAppropriatenessRules(ageBand)}

MIXED-AGE / FAMILY ROLE RULES:
- Every participating child must have a meaningful role in childRoles when activity mode is family.
- Do not make the oldest child merely supervise younger children.
- childRoles.roleTitle must be activity-specific, never a generic one-word title.

${styleRules}

PROSE CAPS (hard):
- summary: max 2 sentences.
- whyItFits: max 2 sentences.
- roleGuide.description / goal / firstAction: short; goal max ~2–3 sentences (under-10 imaginative may use up to 4).
- step instruction: max 2–3 sentences.
- Prefer fewer, denser steps over long prose.

CURRENT MOMENT RULES:
- Treat the current family moment as the source of truth.
- Parent activity, availability, time, space, mess, noise, and supervision must shape every activity.
- If parent is unavailable or supervision is independent, every activity must be child-startable without adult help.
- If quiet, every activity must be low-noise.
- If low mess, avoid cutting, glue, paint, water, food, or cleanup-heavy steps.
- Respect the specific space and max minutes.

SAFETY RULES:
- Activities should be realistic at home.
- Avoid fire, sharp tools, chemicals, choking hazards, unsafe climbing, weapons, or unsupervised internet use.
- Do not suggest buying anything. Do not guilt the parent.
- Respect all parent safety settings strictly (screen-free, no food, no water, no small objects, quiet mode, max minutes, adult help).

PERSONALIZATION RULES:
- STRICT inventory: every activity's "uses" array MUST only list items from the family's available toys/supplies (or common household basics like paper, pencil, cups, pillows if inventory is empty).
- Prefer activities that use at least one owned inventory item when inventory is non-empty.
- Personalize to the active child's interests, avoids, independence, and notes.
- Avoid repeating previous activity titles. Adapt to feedback context.

OUTPUT RULES:
- Return only valid JSON matching the schema.
- Give exactly ${countPhrase}.
- Do NOT include kidRole, mission, starterPrompts, firstMoves, steps, or roles — the server derives those.

CATEGORY AND TRAIT RULES:
- categories: pick 1 to 3 from building, creative, movement, pretend, puzzle, sensory, nature, science, music, reading, social-game, helping.
- traits.setupEffort: very-low | low | medium | high.
- traits.structure: guided | open-ended.
- traits.socialMode: solo | cooperative | competitive | flexible.
- traits.creativity / traits.movement: low | medium | high.
- Do NOT put energy, mess, adultHelp, duration, or supplies inside traits.

QUALITY BAR (imaginative under-10 example shape):
- roleGuide.name: "Sea Signal Finder" (activity-specific)
- step instruction = invitation + clear action
- doneWhen = natural transition cue ("Your first station has a marker.") — never "Something in the story has changed…"
- ifStuck = one decisive nudge, not a reused starter
`.trim();
}

export function buildActivitySuggestionsInput({
  safeCurrentMoment,
  kidMood,
  locationPreference,
  childAgeRange,
  childrenContext,
  groupAgeContext,
  activeChildProfile,
  safeActivityStyle,
  activityMode,
  safeSelectedChildProfiles,
  inventory,
  safeFeedbackContext,
  safePreviousActivityTitles,
  safeSafetySettings,
  playModeTheme = "playroom",
  activityPreferences = null,
  activityCount = 3,
}) {
  const children = Array.isArray(childrenContext) ? childrenContext : [];
  const activeResolved =
    children.find((child) => child.id && child.id === activeChildProfile?.id) ||
    children[0] ||
    null;
  const prefs =
    activityPreferences && typeof activityPreferences === "object"
      ? activityPreferences
      : {};
  const ageBand = resolvePromptAgeBand(groupAgeContext, children);
  const requestedCount = Math.max(1, Math.min(3, Number(activityCount) || 3));

  return `
Family context:
- Parent is currently doing: ${safeCurrentMoment.parentActivity}
- Parent availability: ${safeCurrentMoment.availability}
- Parent needs about: ${safeCurrentMoment.timeNeededMinutes} minutes
- Activity should happen in: ${safeCurrentMoment.space}
- Allowed mess level: ${safeCurrentMoment.messLevel}
- Allowed noise level: ${safeCurrentMoment.noiseLevel}
- Available supervision level: ${safeCurrentMoment.supervisionLevel}
- Kid mood/request: ${kidMood}
- Preferred location: ${locationPreference}
- Legacy age range label (fallback only): ${childAgeRange || "unknown"}
- Activity style preference (family default): ${prefs.activityStylePreference || "mix"}
- Typical mess tolerance: ${prefs.messTolerance || "a-little"}
- Typical setup preference: ${prefs.setupEffort || "a-few-minutes"}
- Typical independence preference: ${prefs.independencePreference || "mostly-independent"}
- Indoor/outdoor preference: ${prefs.indoorOutdoorPreference || "either"}
- Play mode flavor: ${playModeTheme}
- Prompt age band: ${ageBand}
- Participating children (server-derived ages — authoritative):
${
  children.length > 0
    ? children
        .map(
          (child) =>
            `  - ${child.name}: ageYears=${child.ageYears}, ageBand=${child.ageBand}, source=${child.ageSource}, interests=${child.interests.join(", ") || "not specified"}, usually avoids=${(child.avoids || []).join(", ") || "none"}, independence=${child.independenceLevel || "usually-independent"}, notes=${child.needs || "not specified"}`
        )
        .join("\n")
    : "  - None specified"
}
- Group age context: ${formatGroupAgeContextForPrompt(groupAgeContext)}
- Active child profile:
  - Name: ${activeResolved?.name || activeChildProfile?.name || "Not specified"}
  - Exact age years: ${activeResolved?.ageYears ?? "Not specified"}
  - Age band: ${activeResolved?.ageBand || "Not specified"}
  - Interests: ${(activeResolved?.interests || []).join(", ") || activeChildProfile?.interests || "Not specified"}
  - Usually avoids: ${(activeResolved?.avoids || []).join(", ") || (Array.isArray(activeChildProfile?.avoids) ? activeChildProfile.avoids.join(", ") : "None specified")}
  - Independence: ${activeResolved?.independenceLevel || activeChildProfile?.independenceLevel || "usually-independent"}
  - Helpful notes: ${activeResolved?.needs || activeChildProfile?.needs || "Not specified"}
- Activity style requested by child: ${safeActivityStyle}
- Activity mode: ${activityMode || "single-child"}
- Selected child profiles: ${formatChildProfilesForPrompt(
    safeSelectedChildProfiles,
    children
  )}
- Available toys/supplies by category: ${formatInventoryForPrompt(inventory)}
- Inventory constraint: uses[] may ONLY reference items from that list (or common household basics if the list is empty).
- Feedback context: ${safeFeedbackContext}
- Previous activity titles to avoid: ${safePreviousActivityTitles.join(", ")}
- Safety settings:
  - Screen-free only: ${safeSafetySettings.screenFreeOnly}
  - No food activities: ${safeSafetySettings.noFoodActivities}
  - No water play: ${safeSafetySettings.noWaterPlay}
  - No small objects: ${safeSafetySettings.noSmallObjects}
  - Quiet mode: ${safeSafetySettings.quietMode}
  - Max activity minutes: ${safeSafetySettings.maxActivityMinutes}
  - Adult help allowed: ${safeSafetySettings.adultHelpAllowed}

Return exactly ${requestedCount} V2 activities. Required fields per activity:
activityFormatVersion, title, activityStyle, visualTheme, theme, summary,
roleGuide{name,description,goal,firstAction,childRoles[]},
ageFit{minAge,maxAge,targetAges,maturityLevel,independenceLevel,ageFitReason},
starterIdeas[{title,example,kind}], stepDetails[{title,instruction,starterIdeas,doneWhen,ifStuck,roleInstructions}],
extensionIdeas[], uses[], energy, mess, adultHelp, estimatedMinutes, whyItFits,
categories[], traits{setupEffort,structure,socialMode,creativity,movement}.

Do NOT include legacy mirrors (kidRole, mission, starterPrompts, firstMoves, steps, roles).
Keep prose short per PROSE CAPS.
`.trim();
}
