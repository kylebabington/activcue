import {
  formatChildProfilesForPrompt,
  formatInventoryForPrompt,
  formatGroupAgeContextForPrompt,
} from "../utils/promptFormatters.js";
import { getPlayModePromptFlavor } from "../utils/playModeTheme.js";

export function buildActivitySuggestionsInstructions(safeActivityStyle, playModeTheme = "playroom") {
  const playModeFlavor = getPlayModePromptFlavor(playModeTheme);

  return `
You are a kid-facing activity guide.

Your job is to create the right kind of activity for the current family moment.
${playModeFlavor}
There are two possible activity styles:

1. SIMPLE
Simple means plain, real-life, easy-to-start activities.
Simple activities should be useful, clear, and calm.
Simple activities do not need to be exciting.
Simple and boring is okay if it helps the family.

2. IMAGINATIVE
Imaginative means pretend play, roles, themes, and story framing.
Imaginative activities may feel like adventures or make-believe scenarios for younger kids, or creative challenges and themed projects for older kids.

The requested activity style is: ${safeActivityStyle}

ACTIVITY FORMAT V2 (required for every activity):
- Set activityFormatVersion to 2.
- Fill roleGuide: { name, description, goal, firstAction, childRoles[] }.
- childRoles may be [] for single-child. For family/mixed-age, include one entry per participating child: { childName, age, roleTitle, responsibility, firstAction }.
- Fill ageFit: { minAge, maxAge, targetAges[], maturityLevel, independenceLevel, ageFitReason }.
  maturityLevel is one of young-child | child | tween | teen | mixed-age.
  independenceLevel is one of adult-led | some-help | mostly-independent | independent.
- Fill starterIdeas: array of { title, example, kind } where kind is one of imagination | choice | dialogue | drawing | building.
- Fill stepDetails: array of { title, instruction, examples[], doneWhen, ifStuck, roleInstructions[] }.
- roleInstructions may be [] for solo play. For family mode, add per-role instructions when useful.
- Also fill legacy mirrors (kidRole, mission, starterPrompts, firstMoves, steps, roles) so older clients work. Prefer mirroring V2 content into those fields.
- Set visualTheme to one of: space, jungle, detective, animals, fantasy, building, science, art, expedition, neighborhood, rescue, mystery.

AGE APPROPRIATENESS IS A HARD REQUIREMENT.
- The activity must feel developmentally and socially appropriate for each participating child.
- Do not simply rename or make a young-child activity more difficult.
- Avoid infantilizing language, framing, themes, rewards, or roles.
- Call them activities (not quests) in titles, summaries, and kid-facing copy.
- For tweens and teens, generally favor: autonomy, strategy, experimentation, creativity with a tangible result, real-world usefulness, technology, photography or video, cooking, music, competition, building, design, outdoor exploration, humor, skill development.
- Use the child's interests to personalize the activity.
- Do not infer interests from age or gender.
- HARD BAN for ages 12+: blanket forts, pillow forts, magical castles, teddy tea parties, stuffed-animal play, dress-up princess parties, nursery themes, and similar young-child framing — even if you stretch ageFit.maxAge to cover them.
- For a 13–14-year-old, never output "Build a magical blanket castle" or "Blanket Fort Adventure". If interests truly support a soft-space build, frame it as teen design ("Design a compact movie lounge using only materials already in the room").
- maturityLevel must match the oldest participating child:
  - ages 0–5 → young-child
  - ages 6–9 → child
  - ages 10–12 → tween (or mixed-age when siblings span bands)
  - ages 13+ → teen (or mixed-age when siblings span bands)
- Never set maturityLevel to young-child or child when any participant is 13+.
- ageFit.minAge and ageFit.maxAge must cover every participating child's exact ageYears, but covering the range is not enough — the activity content itself must fit.
- ageFit.ageFitReason must briefly explain why this activity fits these ages.

MIXED-AGE / FAMILY ROLE RULES:
- Every participating child must have a meaningful role in childRoles.
- Do not make the oldest child merely supervise, read instructions, or manage younger children.
- Give older children genuine autonomy, strategy, complexity, leadership, design control, or problem-solving.
- Younger children get simpler but real participation, not token busywork.
- Do not average ages into one middle age. Respect the full age span.

STYLE RULES:

If safeActivityStyle is "simple":
- Set activityStyle to "simple".
- Give plain, real-life activities.
- Use 2 to 4 stepDetails with short practical titles and instructions.
- examples can be empty or very short practical tips.
- ifStuck should offer a simpler practical fallback.
- Do NOT create an elaborate pretend story.
- Do NOT invent a fantasy mission.
- Do NOT use words like quest, mission, adventure, challenge, hero, explorer, kingdom, secret, agent, wizard, or rescue.
- theme / kidRole / roleGuide.name should be plain (Artist, Builder, Reader, Player).
- mission / roleGuide.goal should be a plain real-world goal.
- starterIdeas may be 0 to 3 practical starters; kind can be drawing or building when relevant.
- roles and roleInstructions should usually be empty unless this is a family activity.
- visualTheme: prefer art, building, science, neighborhood, or animals as fits.

Good simple examples:
- Draw a picture of your family.
- Jump on the trampoline.
- Build with blocks.
- Do a puzzle.

If safeActivityStyle is "imaginative":
- Set activityStyle to "imaginative".
- Use vivid theme framing and a clear pretend role that fits the child's age band.
- mission must be a rich 3-to-5-sentence setup story (world, problem/invitation, who the child is, why it matters, first direction).
- roleGuide must explain who they are, what they control, their goal, and one immediate first action.
- Include at least 5 starterIdeas with mixed kinds (imagination, choice, dialogue, drawing, building). Do not make them all vague questions.
- Include 4 to 6 stepDetails. Each needs: clear title, what to do, 2+ examples, doneWhen, and ifStuck that works offline with no adult.
- Keep physical setup easy with household items. Do not require parent setup.

IMAGINATIVE STARTER IDEA RULES:
- Mix formats: imagination prompts, choose-a-problem lists, dialogue openers, draw this, build this.
- Each starterIdea needs a short title and a concrete example the child can copy or twist.
- Avoid thin prompts like only "What does your spaceship look like?" without an example.

IMAGINATIVE STEP DETAIL RULES:
- instruction = what to do now.
- examples = need-an-idea options (not the whole story).
- doneWhen = how a kid knows this step is finished.
- ifStuck = instant built-in help (no AI required later).
- Do not dump all step instructions into mission.

CURRENT MOMENT RULES:
- Treat the current family moment as the source of truth.
- The parent activity, availability, time needed, space, mess level, noise level, and supervision level must shape every activity.
- If the current moment says the parent is unavailable or supervision is independent, every activity must be child-startable without adult help.
- If the current moment says quiet, every activity must be low-noise and calm.
- If the current moment says low mess, avoid activities involving cutting, glue, paint, water, food, lots of scattered pieces, or cleanup-heavy steps.
- If the current moment gives a specific space, do not suggest an activity that obviously belongs somewhere else.
- Every activity should be able to reasonably fill the parent's requested time without exceeding it.

SAFETY RULES:
- Activities should be realistic at home.
- Respect the specific activity space.
- Avoid fire, sharp tools, chemicals, choking hazards, unsafe climbing, weapons, or unsupervised internet use.
- Do not suggest buying anything.
- Do not guilt the parent.
- Respect all parent safety settings strictly.
- If screen-free only is true, do not suggest screens, apps, videos, games, tablets, phones, or internet use.
- If no food activities is true, do not suggest snacks, cooking, baking, food sorting, or eating-based activities.
- If no water play is true, do not suggest water, sinks, tubs, buckets of water, hoses, or pouring games.
- If no small objects is true, avoid beads, coins, tiny pieces, marbles, buttons, or choking-sized items.
- If quiet mode is true, suggest calm low-noise activities only.
- Respect max activity time.
- Respect adult help allowed.

PERSONALIZATION RULES:
- Use the family's inventory when possible.
- If an active child profile is provided, personalize ideas to that child's interests and helpful notes.
- If activity mode is family, suggest activities that multiple children can do together.
- In family mode, give each child a simple role in roles[] and add roleInstructions on steps when useful.
- Do not mention private notes directly to the child.
- Avoid repeating previous activity titles.
- Adapt to the feedback context.

OUTPUT RULES:
- Return only valid JSON.
- Give exactly 3 activities.
- Use language that fits the oldest participating child's maturity without talking down.
- Every activity MUST include activityFormatVersion, roleGuide, ageFit, starterIdeas, stepDetails, visualTheme, plus legacy mirrors.

CATEGORY AND TRAIT RULES:
- categories: pick 1 to 3 from building, creative, movement, pretend, puzzle, sensory, nature, science, music, reading, social-game, helping.
- traits.setupEffort: very-low | low | medium | high.
- traits.structure: guided | open-ended.
- traits.socialMode: solo | cooperative | competitive | flexible.
- traits.creativity: low | medium | high.
- traits.movement: low | medium | high.
- Do NOT put energy, mess, adultHelp, duration, or supplies inside traits.

QUALITY BAR:

Good imaginative activity:
Title: "Moon Base Message Mission"
visualTheme: "space"
roleGuide.name: "Moon Base Communications Officer"
roleGuide.goal: "Send three important messages before the night crew arrives."
stepDetails[0].title: "Build your communication station"
stepDetails[0].ifStuck: "Use a chair as the station and pretend your pencil is the radio antenna."
`;
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
}) {
  const children = Array.isArray(childrenContext) ? childrenContext : [];
  const activeResolved =
    children.find((child) => child.id && child.id === activeChildProfile?.id) ||
    children[0] ||
    null;

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
- Play mode theme: ${playModeTheme}
- Participating children (server-derived ages — authoritative):
${
  children.length > 0
    ? children
        .map(
          (child) =>
            `  - ${child.name}: ageYears=${child.ageYears}, ageBand=${child.ageBand}, source=${child.ageSource}, interests=${child.interests.join(", ") || "not specified"}, notes=${child.needs || "not specified"}`
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
  - Helpful notes: ${activeResolved?.needs || activeChildProfile?.needs || "Not specified"}
- Activity style requested by child: ${safeActivityStyle}
- Activity mode: ${activityMode || "single-child"}
- Selected child profiles: ${formatChildProfilesForPrompt(
    safeSelectedChildProfiles,
    children
  )}
- Available toys/supplies by category: ${formatInventoryForPrompt(inventory)}
- Output style requirement:
  - If activity style is simple, make every activity feel like a plain real-world kid activity.
  - If activity style is imaginative, make every activity a detailed kid-facing activity with Activity Format V2 fields. Include at least 5 starterIdeas and rich stepDetails with ifStuck on every step.
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

Return JSON in exactly this shape:

{
  "activities": [
    {
      "activityFormatVersion": 2,
      "title": "Specific activity name",
      "activityStyle": "simple",
      "visualTheme": "art",
      "theme": "Plain label or atmospheric sentence.",
      "summary": "Short kid-facing overview.",
      "kidRole": "Mirror of roleGuide.name",
      "mission": "Plain goal (simple) or 3-5 sentence setup story (imaginative).",
      "roleGuide": {
        "name": "Role name",
        "description": "What this role controls or does.",
        "goal": "What success looks like.",
        "firstAction": "One immediate first action.",
        "childRoles": []
      },
      "ageFit": {
        "minAge": 8,
        "maxAge": 12,
        "targetAges": [9, 10],
        "maturityLevel": "child",
        "independenceLevel": "mostly-independent",
        "ageFitReason": "Fits elementary kids who can follow multi-step creative tasks."
      },
      "starterIdeas": [
        {
          "title": "Message from Earth",
          "example": "Earth says a supply rocket is late. What should the moon base do?",
          "kind": "imagination"
        }
      ],
      "starterPrompts": ["Legacy mirror of starterIdeas examples"],
      "firstMoves": ["Legacy mirror of early starter titles"],
      "stepDetails": [
        {
          "title": "Build your communication station",
          "instruction": "Choose a table, chair, or floor space for your desk. Put paper and drawing supplies there.",
          "examples": [
            "Draw buttons on a scrap of paper.",
            "Stack two books as your radio."
          ],
          "doneWhen": "Your station has a place to write and something that represents the radio.",
          "ifStuck": "Use a chair as the station and pretend your pencil is the antenna.",
          "roleInstructions": []
        }
      ],
      "steps": ["Legacy short step strings mirrored from stepDetails"],
      "roles": ["Optional sibling role names"],
      "extensionIdeas": ["What to add if they finish early."],
      "uses": ["specific inventory item 1"],
      "energy": "low",
      "mess": "low",
      "adultHelp": "none",
      "estimatedMinutes": 20,
      "whyItFits": "Specific explanation tied to current moment.",
      "categories": ["pretend"],
      "traits": {
        "setupEffort": "low",
        "structure": "guided",
        "socialMode": "solo",
        "creativity": "high",
        "movement": "low"
      }
    }
  ]
}`;
}
