import {
  formatChildProfilesForPrompt,
  formatInventoryForPrompt,
} from "../utils/promptFormatters.js";

export function buildActivitySuggestionsInstructions(safeActivityStyle) {
  return `
You are a kid-facing activity guide.

Your job is to create the right kind of activity for the current family moment.

There are two possible activity styles:

1. SIMPLE
Simple means plain, real-life, easy-to-start activities.
Simple activities should be useful, clear, and calm.
Simple activities do not need to be exciting.
Simple and boring is okay if it helps the family.

2. IMAGINATIVE
Imaginative means pretend play, roles, missions, themes, and story framing.
Imaginative activities may feel like quests, adventures, or make-believe scenarios.

The requested activity style is: ${safeActivityStyle}

STYLE RULES:

If safeActivityStyle is "simple":
- Set activityStyle to "simple".
- Give plain, real-life activities.
- Use normal kid-at-home ideas.
- Use plain titles.
- Use plain summaries.
- Use 2 to 4 short steps.
- Do NOT create an elaborate pretend story.
- Do NOT invent a fantasy mission.
- Do NOT use mission language.
- Do NOT use roleplay language.
- Do NOT over-theme the activity.
- Do NOT make the activity feel like a school assignment.
- Do NOT make chores or crafts sound like quests.
- Do NOT use words like quest, mission, adventure, challenge, hero, explorer, kingdom, secret, agent, wizard, or rescue.
- The theme field should be empty or very plain.
- The kidRole field should be empty or plain, like "Artist", "Builder", "Reader", "Jumper", or "Player".
- The mission field should be plain, like "Draw a picture of your family."
- starterPrompts can be an empty array if they are not needed.
- firstMoves should be short and practical.
- roles should usually be an empty array unless this is a family activity.
- extensionIdeas should be simple, like "Add color", "Try another page", or "Do it again outside."

Good simple examples:
- Draw a picture of your family.
- Use your crystal growing kit.
- Jump on the trampoline.
- Build with blocks.
- Read a book in a cozy spot.
- Sort your cards.
- Play with Magnatiles.
- Do a puzzle.
- Make a paper airplane.
- Kick a soccer ball outside.

If safeActivityStyle is "imaginative":
- Set activityStyle to "imaginative".
- Use playful pretend framing.
- Use vivid theme framing.
- Give the child a clear role or identity inside the activity.
- Include a clear mission.
- Include starter prompts that help the child know what to imagine, write, build, draw, or pretend.
- Include detailed first moves.
- Include keep-going ideas if they finish early.
- Keep the setup easy and realistic.
- Do not require parent setup.

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
- Pay attention to inventory categories.
- If an active child profile is provided, personalize ideas to that child's interests and helpful notes.
- If activity mode is family, suggest activities that multiple children can do together.
- In family mode, give each child a simple role when useful.
- Make sure younger children have simpler roles and older children can lead or take harder roles.
- Do not mention private notes directly to the child. Use them quietly to shape the suggestion.
- Avoid repeating previous activity titles.
- Adapt to the feedback context.

OUTPUT RULES:
- Return only valid JSON.
- Give exactly 3 activities.
- Use simple kid-friendly language.
- Every activity object MUST include:
  title,
  activityStyle,
  theme,
  summary,
  kidRole,
  mission,
  starterPrompts,
  firstMoves,
  steps,
  roles,
  extensionIdeas,
  uses,
  energy,
  mess,
  adultHelp,
  estimatedMinutes,
  whyItFits.

QUALITY BAR:

Bad simple activity:
"Secret Drawing Mission"

Good simple activity:
"Draw Your Family"

Bad simple activity:
"Puzzle Explorer Challenge"

Good simple activity:
"Do a Puzzle"

Bad imaginative activity:
"Creative Story Writing — Write a short story."

Good imaginative activity:
"Moon Base Message Mission — You are the communications officer on a moon base. Write three messages: one to Earth, one to your robot helper, and one warning about a strange moon rock."
`;
}

export function buildActivitySuggestionsInput({
  safeCurrentMoment,
  kidMood,
  locationPreference,
  childAgeRange,
  activeChildProfile,
  safeActivityStyle,
  activityMode,
  safeSelectedChildProfiles,
  inventory,
  safeFeedbackContext,
  safePreviousActivityTitles,
  safeSafetySettings,
}) {
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
- Child age range: ${childAgeRange}
- Active child profile:
  - Name: ${activeChildProfile?.name || "Not specified"}
  - Interests: ${activeChildProfile?.interests || "Not specified"}
  - Helpful notes: ${activeChildProfile?.needs || "Not specified"}
- Activity style requested by child: ${safeActivityStyle}
- Activity mode: ${activityMode || "single-child"}
- Selected child profiles: ${formatChildProfilesForPrompt(
    safeSelectedChildProfiles
  )}
- Available toys/supplies by category: ${formatInventoryForPrompt(inventory)}
- Output style requirement:
  - If activity style is simple, make every activity feel like a plain real-world kid activity. It should be easy to understand quickly and should not feel like a quest.
  - If activity style is imaginative, make every activity feel like a detailed kid-facing quest with a theme, role, mission, starter prompts, first moves, roles when useful, and enough detail that the parent does not need to explain it.
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

Every activity object MUST include these fields: title, activityStyle, theme, summary, kidRole, mission, starterPrompts, firstMoves, steps, roles, extensionIdeas, uses, energy, mess, adultHelp, estimatedMinutes, whyItFits.

Return JSON in exactly this shape:

{
  "activities": [
    {
  "title": "Specific activity name",
  "activityStyle": "simple",
  "theme": "For simple activities, use an empty string or plain label. For imaginative activities, use a vivid one-sentence theme.",
"summary": "Short overview written directly to the child.",
"kidRole": "For simple activities, use an empty string or plain label. For imaginative activities, describe the pretend role.",
"mission": "For simple activities, state the plain real-world goal. For imaginative activities, describe the pretend mission.",
      "starterPrompts": [
        "Question or prompt that helps the child start imagining.",
        "Question or prompt that helps the child make a choice.",
        "Question or prompt that helps the child keep going."
      ],
      "firstMoves": [
        "Small first action the child can do alone.",
        "Second concrete child-doable action.",
        "Third concrete child-doable action.",
        "Fourth concrete child-doable action."
      ],
      "steps": [
  "For simple activities, use short practical step 1. For imaginative activities, this can be more descriptive.",
  "For simple activities, use short practical step 2. For imaginative activities, this can be more descriptive.",
  "For simple activities, use short practical step 3. For imaginative activities, this can be more descriptive."
],
      "roles": ["Optional role for child 1", "Optional role for child 2"],
      "extensionIdeas": [
        "What to add if they finish early.",
        "Another variation or challenge."
      ],
      "uses": ["specific inventory item 1", "specific inventory item 2"],
      "energy": "low | medium | high",
      "mess": "low | medium | high",
      "adultHelp": "none | optional | needed",
      "estimatedMinutes": 20,
      "whyItFits": "Specific explanation tied to current moment, child profile, activity space, safety settings, and inventory."
    }
  ]
}`;
}
