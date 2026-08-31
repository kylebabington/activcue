import {
  formatInventoryForPrompt,
} from "../utils/promptFormatters.js";
import { getPlayModePromptFlavor } from "../utils/playModeTheme.js";
import { BRAND } from "../../src/config/brand.js";
import { getPolicyAgeBand, getDevelopmentalComplexityBudget } from "../utils/activityAgePolicy.js";
import { clampAiGenerateCount } from "../utils/suggestionFill.js";
import { UNDER10_OPENING_STORY_PROMPT } from "../utils/narrativeStoryRequirements.js";
import {
  buildActivityDesignBrief,
  formatActivityDesignBriefForPrompt,
} from "../utils/activityDesignBrief.js";

/**
 * Resolve which age-voice band to include for the oldest participant.
 * @returns {"young-child"|"early-elementary"|"elementary"|"older-elementary"|"tween"|"young-teen"|"teen"|"mixed"}
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
  if (ages.length >= 2) {
    const youngest = Math.min(...ages);
    if (oldest - youngest >= 3) {
      return "mixed";
    }
  }
  return getPolicyAgeBand(oldest);
}

function resolveYoungestAge(childrenContext = [], groupAgeContext = {}) {
  const ages = (Array.isArray(childrenContext) ? childrenContext : [])
    .map((child) => Number(child?.ageYears))
    .filter((age) => Number.isFinite(age));
  if (ages.length > 0) return Math.min(...ages);
  const youngest = Number(groupAgeContext?.youngestAge);
  return Number.isFinite(youngest) ? youngest : null;
}

function buildComplexityBudgetRules(budget, style) {
  const maxActions = budget?.maxActionsPerScene ?? 4;
  const maxScenes = budget?.maxScenes ?? 4;
  const minActions = style === "simple" ? 2 : 3;
  return `
COMPLEXITY BUDGET (hard — must match validator):
- Maximum ${maxScenes} stepDetails (scenes).
- Maximum ${maxActions} actions per scene.
- Minimum ${minActions} actions per scene when the scene needs multiple steps.
- setupGuide.steps preferably ≤ ${budget?.maxSetupSteps ?? 5}.
- Each action is one concrete sentence. Use doneWhen and ifStuck for completion and recovery — do not pad a scene with extra vague actions.
`.trim();
}

function buildSimpleStyleRules(budget) {
  const maxActions = budget?.maxActionsPerScene ?? 4;
  return `
STYLE RULES (simple — only):
- Set activityStyle to "simple".
- Simple means: low setup, literal directions, familiar materials, child-startable, minimal parent help — NOT low engagement or one obvious action.
- Separate these dimensions: setup effort (low), instruction complexity (concrete), engagement depth (substantial), imaginative framing (none required).
- Use 2 to ${budget?.maxScenes ?? 4} stepDetails with practical titles and self-contained actions[].
- Each actions[] item must say what to do, how to do it, what to try if stuck, and how to know the step is finished (via doneWhen).
- Each step should include 1 to 2 practical starterIdeas (concrete tips the child can try now).
- Activity-level starterIdeas: 0 to 2 practical "how to begin" directions.
- ifStuck should offer a simpler practical fallback that is NOT the same as a starter idea.
- Do NOT create an elaborate pretend story or fantasy mission.
- Do NOT use words like quest, mission, adventure, challenge, hero, explorer, kingdom, secret, agent, wizard, or rescue.
- Do NOT include storyBeat or finishGuide.resolution — simple activities use plain goals only.
- theme should be plain. roleGuide.name may be empty unless family mode needs real jobs.
- roleGuide.description should state a plain real-world goal (≤2 sentences).
- roleInstructions should usually be empty unless this is a family activity.
- visualTheme: prefer art, building, science, neighborhood, or animals as fits.
- summary ≤ 2 short sentences. whyItFits ≤ 2 short sentences.
- Maximum ${maxActions} actions per scene.

Good simple examples (substantial, not one-liners):
- Sort pantry items by color into three labeled piles, then rearrange one shelf section so the tallest items are in back.
- Build a paper ramp and test which cardboard angle makes a toy car roll farthest; record the winning angle on a sticky note.
- Create a living-room obstacle path using pillows and tape lines, then time yourself completing it twice and beat your first time.
`.trim();
}

function buildCausalStoryDesignRules(ageBand, participantCount = 1) {
  const isTeen = ageBand === "teen" || ageBand === "young-teen";

  const multiChild =
    participantCount >= 2
      ? `
MULTI-CHILD STORY ROLES (hard when 2+ children participate):
- Give each childRole a distinct contribution in the opening story — describe what each child does, not necessarily the exact roleTitle string.
- Give each role a distinct reason to exist — both must affect the outcome.
- Refer to each role's contribution in relevant sceneSetup fields.
- Do not make the older child merely supervise.
`.trim()
      : "";

  const ageTone = isTeen || ageBand === "tween" || ageBand === "older-elementary"
    ? `Use challenge-first framing for ages 10+ — creative brief, design problem, investigation, or mystery. NOT young-child rescue fantasy unless interests explicitly ask for roleplay.`
    : `Use vivid causal adventure for under-10 — specific place, inciting event, named problem, stakes. ${UNDER10_OPENING_STORY_PROMPT}`;

  return `
CAUSAL ACTIVITY DESIGN — HARD REQUIREMENT
An imaginative activity is ONE continuous story, not a collection of themed mini-games.

Start with a specific incident that creates a problem, need, mystery, goal, or opportunity.

Every scene must follow this chain:
WHAT CHANGED → WHY IT MATTERS → WHAT THE CHILD DOES → WHAT HAPPENS BECAUSE THEY SUCCEEDED

Use BUT / THEREFORE story logic. Do NOT build structure with "and then", unrelated surprises, arbitrary checkpoints, or generic mini-games.

WHY TEST (hard): For every substantial action, the child must be able to answer "Why am I doing this right now?" from sceneSetup — not from the activity theme.

SWAP TEST (hard): If two scenes could be reordered without breaking the story, the story is too generic. Rebuild so each scene exists because of the previous sceneOutcome.

REPLACEMENT TEST (hard): If a scene's main action could be swapped for an unrelated children's activity without changing the story, rewrite the action or the story problem.

Never add build/find/crawl/jump/balance/carry/sort/hide/search/draw/throw/collect/stack/race/count merely for variety — only when they logically solve the current story problem.

${ageTone}

stepDetails[].sceneSetup (required): what has just changed and why action is necessary NOW.
stepDetails[].actions[]: concrete directions that solve the sceneSetup problem.
stepDetails[].doneWhen: observable success for this scene.
stepDetails[].sceneOutcome (required): what changed because the child succeeded — must create/reveal the reason for the next scene.
finishGuide.resolution: how the OPENING problem from story is resolved (narrative only).
finishGuide.action: what the child physically does for the ending (distinct from resolution).
finishGuide.doneWhen: observable completion (distinct from resolution and action).

${multiChild}
`.trim();
}

function buildImaginativeStyleRules(ageBand, budget = {}) {
  const maxScenes = budget.maxScenes ?? 5;
  const maxActions = budget.maxActionsPerScene ?? 7;
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

  if (ageBand === "teen" || ageBand === "young-teen") {
    return `${shared}

TEEN / YOUNG-TEEN FRAMING:
- This is a young teenager. The activity must feel socially appropriate for a teenager.
- Do not reuse preschool pretend-play framing and simply increase difficulty.
- Prefer autonomy, design, strategy, invention, building, investigation, photography, music, games, or creative production.
- HARD RULE: do not invent an imaginary story world unless the child's listed interests explicitly ask for roleplay/fiction.
- roleGuide.description: crisp creative brief (goal + constraints + what done looks like). Max ~2 sentences. Put stakes in story.
- Prefer categories: puzzle, creative, science, building, music, reading, nature, social-game. Avoid "pretend" unless interests demand it.
- Activity-level starterIdeas: 3–5 thinking prompts (approaches, constraints, variations) — not "pretend you are…".
- Include 3 to 5 stepDetails. Each needs 1–2 step-specific starterIdeas, a self-contained instruction, doneWhen as a tangible ready-to-continue cue, ifStuck as a simpler strategy.
- visualTheme: prefer building, science, art, detective, mystery, expedition, neighborhood — avoid fantasy unless interests demand it.
- Language should sound like a cool challenge for a teen, never like preschool play.
`.trim();
  }

  if (ageBand === "tween" || ageBand === "older-elementary") {
    return `${shared}

OLDER-ELEMENTARY / TWEEN FRAMING:
- Prefer creative challenges over full pretend worlds. Light theme is optional.
- Allow planning, strategy, simple optimization, and design constraints.
- roleGuide.description: short challenge brief (1–2 sentences), not a long lore dump. Put the design problem in story.
- Avoid forced make-believe dialogue and costume play.
- Activity-level starterIdeas: at least 4 with mixed kinds.
- Include 3 to 5 stepDetails. Each needs 2 step-specific starterIdeas, a self-contained instruction, transition-style doneWhen, and ifStuck rescue.
`.trim();
  }

  if (ageBand === "early-elementary") {
    return `${shared}

EARLY-ELEMENTARY (AGES 6–7) FRAMING:
- This is an early-elementary child. Do not assume strong independent reading.
- Instructions must be concrete and literal. Use short actions and limited choices.
- Maximum ${Math.min(maxScenes, 4)} scenes with up to ${Math.min(maxActions, 4)} actions each. Setup steps preferably ≤ ${budget.maxSetupSteps ?? 5}.
- The child must never infer missing setup. Provide examples they can copy immediately.
- Avoid abstract planning unless every part is explicitly shown.
- Never require the child to design the rules before beginning.
- Make all invented locations explicit (e.g. "Call them Station 1, Station 2, and Station 3").
- Vivid theme framing and a clear pretend role are OK when a natural role exists.
`.trim();
  }

  if (ageBand === "elementary") {
    return `${shared}

ELEMENTARY (AGES 8–9) FRAMING:
- Allow up to ${maxScenes} scenes, slightly more planning, simple written lists, and two-step decisions.
- Up to ${maxActions} actions per scene when each action is concrete.
- More open-ended creation is OK when examples are provided.
- Keep directions concrete; avoid multi-stage planning without scaffolding.
`.trim();
  }

  // young-child + mixed default
  const under10 = `
YOUNG-CHILD / UNDER-10 FRAMING:
- Vivid theme framing and a clear pretend role are OK when a natural role exists.
- story carries the world, problem, and invitation; roleGuide.description states who they are and their overall job (≤4 sentences).
- Prefer story-beat step titles, then a full instruction that a child can follow without guessing.
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

  if (
    ageBand === "teen" ||
    ageBand === "young-teen" ||
    ageBand === "tween" ||
    ageBand === "older-elementary" ||
    ageBand === "mixed"
  ) {
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

  const youngest = resolveYoungestAge(
    options.childrenContext,
    options.groupAgeContext
  );
  const budget = getDevelopmentalComplexityBudget(youngest, style);

  const styleRules =
    style === "simple"
      ? buildSimpleStyleRules(budget)
      : `${buildImaginativeStyleRules(ageBand, budget)}

${buildCausalStoryDesignRules(ageBand, options.childrenContext?.length || 1)}`;

  const formatBlock =
    style === "imaginative"
      ? `
ACTIVITY FORMAT V4 (required — imaginative only):
- Set activityFormatVersion to 4 and qualityContractVersion to 1.
- activityStyle must be "imaginative".
- story: WHY this situation exists — WHERE, WHAT happened before play, current PROBLEM/need/mystery, WHY it matters, WHY the child/children are needed. Under-10: ${UNDER10_OPENING_STORY_PROMPT.replace(/\n/g, " ")} No setup directions.
- summary: max 2 sentences — what the child will do.
- roleGuide: { name, description, childRoles[] }. WHO the child is. No fluff titles.
- setupGuide: { needed[], steps[], readyWhen }. Physical prep before Scene 1 only.
- stepDetails: { title, sceneSetup, actions[], starterIdeas[], doneWhen, sceneOutcome, ifStuck, roleInstructions[] }. Do NOT include instruction or storyBeat.
- finishGuide: { resolution, action, example, doneWhen, extensions[] }. resolution = narrative payoff; action = final physical step; doneWhen = observable completion. Do not duplicate text across these fields.
- starterIdeas: concrete examples. title and example must differ.
- Set visualTheme to one of: space, jungle, detective, animals, fantasy, building, science, art, expedition, neighborhood, rescue, mystery.

SECTION OWNERSHIP (hard):
- story → opening situation and reason only
- roleGuide → who + overall job only
- setupGuide → physical prep before play only
- sceneSetup → why action is necessary NOW in this scene
- actions[] → in-scene literal directions only
- sceneOutcome → story consequence of success (causes next scene)
- finishGuide.resolution → how opening problem was resolved
- finishGuide.action → final physical ending step
- finishGuide.doneWhen → observable ending completion
`
      : `
ACTIVITY FORMAT V3 (required — simple activities only):
- Set activityFormatVersion to 3.
- story: plain real-world goal. No fantasy mission.
- stepDetails: { title, actions[], starterIdeas[], doneWhen, ifStuck, roleInstructions[] }. No storyBeat, sceneSetup, or sceneOutcome.
- finishGuide: { action, example, doneWhen, extensions[] }. No resolution field.
`;

  const requestedCount = clampAiGenerateCount(options.activityCount);
  const countPhrase =
    requestedCount === 1
      ? "1 activity"
      : `${requestedCount} activities`;

  const complexityRules = buildComplexityBudgetRules(budget, style);

  return `
You are ${BRAND.name}'s kid-facing activity guide.

Your job is to create the right kind of activity for the current family moment.
${playModeFlavor}

Follow the ACTIVITY DESIGN BRIEF in the user input for exact participant ages and complexity budget.
Do not average children into one synthetic age.

Requested activity style: ${style}
Age voice band for this batch: ${ageBand}

${formatBlock}

ACTION WRITING RULES (hard — every actions[] item):
- Each action is one independently executable sentence starting with a concrete verb: Get, Put, Place, Walk, Stand, Sit, Pick up, Turn, Draw, Write, Say, Count, Choose, Move, Build, Fold, Line up, Point, Look.
- ${complexityRules}
- BAN vague standalone actions: Explore the station, Continue the story, Investigate the clue, Prepare the lab, Set everything up, Make it better, Create your signal, Figure out what happens, Use your imagination.
- If you need investigation language, follow it immediately with literal steps.
- doneWhen must be observable ("Three clues are lined up beside your stuffed animal") — never "You finished this step" or "Move on when ready."
- ifStuck is one simpler rescue, not a reused starterIdea.
- For adultHelp "none": never say Ask a grown-up, Have someone hide, Have your parent, Ask someone to prepare.

${buildAgeAppropriatenessRules(ageBand)}

MIXED-AGE / FAMILY ROLE RULES:
- Every participating child must have a meaningful role in childRoles when activity mode is family.
- Do not make the oldest child merely supervise younger children.
- childRoles.roleTitle must be activity-specific, never a generic one-word title.

${styleRules}

PROSE CAPS (hard):
- summary: max 2 sentences.
- whyItFits: max 2 sentences.
- roleGuide.description: short (max ~2–3 sentences).

STEP WRITING RULES (hard — every stepDetail.actions[]):
- The child should not have to reverse-engineer what you meant.
- Follow the complexity budget for actions per scene.
- Each action must name THIS activity's objects and where they go.
- Use doneWhen for how to know the scene is finished; use ifStuck for one simpler rescue.
- BAD: "Draw the map." GOOD: "Put paper on the floor. Draw three room landmarks you can see — a chair, a door, and a lamp — then draw a path between them."
- title is a short beat name, never a substitute for actions[].
- doneWhen is an observable ready-to-continue cue for THIS step only ("Every zone has a name you can point to.", "You have drawn a path between at least two zones.").
- NEVER write generic doneWhen such as "You finished this step", "You finished this part of the activity", "when you finish this step", "this step is done", or "the objective is complete".
- doneWhen must name a visible result from this step's action, not the mere fact that the step happened.
- ifStuck is one simpler rescue that is NOT a reused starterIdea.
- roleInstructions are OPTIONAL supplements. They must NOT contain information required to understand the main instruction. The scene must still work if roleInstructions are ignored.

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
- step instruction = what to do + which objects to use + where they go + what to try if stuck + what done looks like. Never a 3–6 word label.
- step title = a short story-beat name only. Never the first words of the instruction.
- doneWhen = natural transition cue ("Your first station has a marker.") — never "You finished this step" or "Something in the story has changed…"
- ifStuck = one decisive nudge, not a reused starter
- roleInstructions add a child's job; they never replace the scene instruction
`.trim();
}

export function buildActivitySuggestionsInput({
  safeCurrentMoment,
  kidMood,
  locationPreference,
  childrenContext,
  groupAgeContext,
  safeActivityStyle,
  activityMode,
  inventory,
  safeFeedbackContext,
  safePreviousActivityTitles,
  safeSafetySettings,
  playModeTheme = "playroom",
  activityPreferences = null,
  activityCount = 3,
  energyLevel = null,
}) {
  const children = Array.isArray(childrenContext) ? childrenContext : [];
  const prefs =
    activityPreferences && typeof activityPreferences === "object"
      ? activityPreferences
      : {};
  const requestedCount = clampAiGenerateCount(activityCount);
  const participantCount = children.length;
  const resolvedMode =
    participantCount >= 2 ? "family" : activityMode || "single-child";
  const resolvedEnergy =
    energyLevel || kidMood || "neutral";

  const designBrief = buildActivityDesignBrief({
    childrenContext: children,
    groupAgeContext,
    activityMode: resolvedMode,
    activityStyle: safeActivityStyle,
  });
  const designBriefJson = formatActivityDesignBriefForPrompt(designBrief);

  const formatFields =
    safeActivityStyle === "imaginative"
      ? `Return exactly ${requestedCount} V4 imaginative activities. Required fields per activity:
activityFormatVersion (4), qualityContractVersion (1), title, activityStyle ("imaginative"), visualTheme, story, summary,
roleGuide{name,description,childRoles[]},
ageFit{minAge,maxAge,targetAges,maturityLevel,independenceLevel,ageFitReason},
setupGuide{needed,steps,readyWhen},
starterIdeas[{title,example,kind}], stepDetails[{title,sceneSetup,actions,starterIdeas,doneWhen,sceneOutcome,ifStuck,roleInstructions}],
finishGuide{resolution,action,example,doneWhen,extensions},
uses[], energy, mess, adultHelp, estimatedMinutes, whyItFits,
categories[], traits{setupEffort,structure,socialMode,creativity,movement}.`
      : `Return exactly ${requestedCount} V3 simple activities. Required fields per activity:
activityFormatVersion (3), title, activityStyle ("simple"), visualTheme, story, summary,
roleGuide{name,description,childRoles[]},
ageFit{minAge,maxAge,targetAges,maturityLevel,independenceLevel,ageFitReason},
setupGuide{needed,steps,readyWhen},
starterIdeas[{title,example,kind}], stepDetails[{title,actions,starterIdeas,doneWhen,ifStuck,roleInstructions}],
finishGuide{action,example,doneWhen,extensions},
uses[], energy, mess, adultHelp, estimatedMinutes, whyItFits,
categories[], traits{setupEffort,structure,socialMode,creativity,movement}.`;

  const singlePlayerRules =
    participantCount <= 1
      ? `
SINGLE-PLAYER IS A HARD REQUIREMENT.
Exactly one child is participating.
- Write every required action so one child can complete it.
- Use singular "you."
- roleGuide.childRoles must be empty.
- Do not create partner tasks.
- Do not create teams.
- Do not invent siblings.
- Do not say "one person does X while another..."
- Do not require another person to hide, hold, judge, deliver, or respond.
`.trim()
      : `
FAMILY PARTICIPANTS ONLY.
Only the listed participants exist.
Do not invent extra players.
Every listed child must have a meaningful role in childRoles.
`.trim();

  return `
CURRENT REQUEST — AUTHORITATIVE

ACTIVITY DESIGN BRIEF (follow exactly — do not duplicate ages elsewhere):
${designBriefJson}

ACTIVITY:
Style: ${safeActivityStyle}
Energy: ${resolvedEnergy}

CURRENT FAMILY MOMENT:
Parent activity: ${safeCurrentMoment.parentActivity}
Available time: ${safeCurrentMoment.timeNeededMinutes} minutes
Space: ${safeCurrentMoment.space}
Mess: ${safeCurrentMoment.messLevel}
Noise: ${safeCurrentMoment.noiseLevel}
Supervision: ${safeCurrentMoment.supervisionLevel}
Availability: ${safeCurrentMoment.availability}

SAFETY:
Screen-free only: ${safeSafetySettings.screenFreeOnly}
No food activities: ${safeSafetySettings.noFoodActivities}
No water play: ${safeSafetySettings.noWaterPlay}
No small objects: ${safeSafetySettings.noSmallObjects}
Quiet mode: ${safeSafetySettings.quietMode}
Max activity minutes: ${safeSafetySettings.maxActivityMinutes}
Adult help allowed: ${safeSafetySettings.adultHelpAllowed}

${singlePlayerRules}

Family context (supporting detail):
- Preferred location / space: ${safeCurrentMoment.space || locationPreference || "unspecified"}
- Indoor/outdoor preference: ${prefs.indoorOutdoorPreference || "either"}
- Activity style preference (family default): ${prefs.activityStylePreference || "mix"}
- Typical mess tolerance: ${prefs.messTolerance || "a-little"}
- Typical setup preference: ${prefs.setupEffort || "a-few-minutes"}
- Typical independence preference: ${prefs.independencePreference || "mostly-independent"}
- Play mode flavor: ${playModeTheme}
- Available toys/supplies by category: ${formatInventoryForPrompt(inventory)}
- Inventory constraint: uses[] may ONLY reference items from that list (or common household basics if the list is empty).
- Feedback context: ${safeFeedbackContext}
- Previous activity titles to avoid: ${safePreviousActivityTitles.join(", ")}

${formatFields}

Do NOT include instruction, theme, extensionIdeas, or legacy mirrors.
Keep summary/whyItFits short. actions[] must follow ACTION WRITING RULES.
`.trim();
}
