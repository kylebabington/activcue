// server/index.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: "./server/.env" });

const app = express();
const PORT = 3001;

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(
    cors({
        origin: /^http:\/\/localhost:\d+$/,
    })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Family Activity Helper backend is running.",
    });
});

app.post("/api/activity-suggestions", async (req, res) => {
    try {
        const {
            // currentMoment is the new main object that describes
            // what is happening in the family right now.
            currentMoment,

            // These older fields are still accepted as fallbacks.
            // Keeping them prevents older frontend code from breaking.
            parentActivity,
            parentAvailability,
            inventory,
            kidMood,
            messLevel,
            locationPreference,
            activitySpace,
            childAgeRange,
            activityMode,
            activeChildProfile,
            selectedChildProfiles,
            feedbackContext,
            previousActivityTitles,
            safetySettings,
        } = req.body;

        const safeCurrentMoment = {
            // What the parent is doing right now.
            // Prefer currentMoment.parentActivity.
            // Fall back to old parentActivity.
            // Fall back again to a safe default.
            parentActivity:
                currentMoment?.parentActivity ||
                parentActivity ||
                "Doing a household task",

            // Whether the child can interrupt.
            // Expected values:
            // - helper-welcome
            // - ask-first
            // - do-not-interrupt
            availability:
                currentMoment?.availability ||
                parentAvailability ||
                "ask-first",

            // How much time the parent needs.
            // Convert it to a number so the prompt and safety settings stay reliable.
            timeNeededMinutes: Number(
                currentMoment?.timeNeededMinutes ||
                safetySettings?.maxActivityMinutes ||
                20
            ),

            // Where the child should do the activity.
            space:
                currentMoment?.space ||
                activitySpace ||
                "Living room",

            // How much mess is acceptable.
            // Expected values:
            // - low
            // - medium
            // - high
            messLevel:
                currentMoment?.messLevel ||
                messLevel ||
                "low",

            // How noisy the activity can be.
            // Expected values:
            // - quiet
            // - normal
            // - loud
            noiseLevel:
                currentMoment?.noiseLevel ||
                (safetySettings?.quietMode ? "quiet" : "normal"),

            // How much adult supervision is available.
            // Expected values:
            // - independent
            // - mostly-independent
            // - nearby
            supervisionLevel:
                currentMoment?.supervisionLevel ||
                "mostly-independent",
        };

        if (!safeCurrentMoment.parentActivity || !safeCurrentMoment.availability || !kidMood) {
            return res.status(400).json({
                error: "Missing required fields.",
            });
        }

        if (!Array.isArray(inventory)) {
            return res.status(400).json({
                error: "Inventory must be an array.",
            });
        }

        const safeFeedbackContext =
            feedbackContext && feedbackContext.trim() !== ""
                ? feedbackContext
                : "No specific feedback yet.";

        const safePreviousActivityTitles = Array.isArray(previousActivityTitles)
            ? previousActivityTitles
            : [];

        const safeSelectedChildProfiles = Array.isArray(selectedChildProfiles)
            ? selectedChildProfiles
            : [];

        const safeSafetySettings = {
            // Screen-free is true by default because this app is meant
            // to help kids do real-world activities, not grab another screen.
            screenFreeOnly: safetySettings?.screenFreeOnly ?? true,

            // Food activities are allowed by default unless the parent disables them.
            noFoodActivities: safetySettings?.noFoodActivities ?? false,

            // Water play is blocked by default because it often needs more supervision.
            noWaterPlay: safetySettings?.noWaterPlay ?? true,

            // Small objects are blocked by default for safety.
            noSmallObjects: safetySettings?.noSmallObjects ?? true,

            // Quiet mode should follow the current moment.
            // If parent chose quiet, this becomes true.
            quietMode: safeCurrentMoment.noiseLevel === "quiet",

            // The current moment controls the target duration.
            maxActivityMinutes: safeCurrentMoment.timeNeededMinutes,

            // Adult help should match supervision level.
            // If the current moment says independent, adult help should be "none".
            // If mostly-independent, adult help can be optional.
            // If nearby, optional help is okay.
            adultHelpAllowed:
                safeCurrentMoment.supervisionLevel === "independent"
                    ? "none"
                    : safeCurrentMoment.supervisionLevel === "mostly-independent"
                        ? "optional"
                        : safetySettings?.adultHelpAllowed || "optional",
        };

        const instructions = `
You are an imaginative kid-facing play guide.

Your job is not to give generic activity ideas.
Your job is to create detailed, self-starting play quests that a child can understand and begin without parent help.

The response should feel like a parent, camp counselor, or playful teacher is guiding the child directly through the screen.

Important:
- Do NOT rely on the parent to set up the scene.
- Do NOT include a "parent setup" section.
- Do NOT tell the parent to hide things, prepare clues, arrange materials, or lead the activity.
- The child should be able to start with normal visible household items from the inventory.
- If setup is needed, make it child-doable.
- Do NOT give broad generic activities like "paper crafts", "story writing", "treasure hunt", "drawing", or "build with blocks" unless they are transformed into a specific themed quest with a mission, role, prompts, and first moves.
-If the request asks for simple activities, avoid elaborate imaginative framing. Keep the title, summary, steps, and mission plain and practical. A simple activity may still use the same JSON fields, but the wording should feel like a normal activity, not a pretend quest.
-If the request asks for imaginative activities, use playful pretend framing, roles, and mission language, but keep the setup easy and realistic.

Rules:
- Treat the current family moment as the source of truth.
- The parent activity, availability, time needed, space, mess level, noise level, and supervision level must shape every activity.
- If the current moment says the parent is unavailable or supervision is independent, every activity must be child-startable without adult help.
- If the current moment says quiet, every activity must be low-noise and calm.
- If the current moment says low mess, avoid activities involving cutting, glue, paint, water, food, lots of scattered pieces, or cleanup-heavy steps.
- If the current moment gives a specific space, do not suggest an activity that obviously belongs somewhere else.
- Every activity should be able to reasonably fill the parent's requested time without exceeding it.
- Return only valid JSON.
- Give exactly 3 activities.
- Each activity must be a specific themed quest, not a generic activity.
- Use vivid theme framing.
- Give the child a clear role or identity inside the activity.
- Include starter prompts that help the child know what to imagine, write, build, draw, or pretend.
- Include detailed first moves.
- Include keep-going ideas if they finish early.
- Use the family's inventory when possible.
- Pay attention to inventory categories. Use categories to combine items creatively, such as building toys plus pretend play, or art supplies plus household-safe items.
- Activities should be realistic at home.
- Respect the specific activity space. Do not suggest ideas that do not fit the selected room or place.
- Avoid fire, sharp tools, chemicals, choking hazards, unsafe climbing, weapons, or unsupervised internet use.
- Respect the parent's availability.
- If the parent is busy or unavailable, the activity must be independent.
- Use simple kid-friendly language.
- If an active child profile is provided, personalize ideas to that child's interests and helpful notes.
- If activity mode is family, suggest activities that multiple children can do together.
- In family mode, give each child a simple role when possible.
- Make sure younger children have simpler roles and older children can lead or take harder roles.
- Do not mention private notes directly to the child. Use them quietly to shape the suggestion.
- Do not guilt the parent.
- Do not suggest buying anything.
- Avoid repeating previous activity titles.
- Adapt to the feedback context.
- Follow all parent safety settings strictly.
- If screen-free only is true, do not suggest screens, apps, videos, games, tablets, phones, or internet use.
- If no food activities is true, do not suggest snacks, cooking, baking, food sorting, or eating-based activities.
- If no water play is true, do not suggest water, sinks, tubs, buckets of water, hoses, or pouring games.
- If no small objects is true, avoid beads, coins, tiny pieces, marbles, buttons, or choking-sized items.
- If quiet mode is true, suggest calm low-noise activities only.
- Respect max activity time.
- Respect adult help allowed.

Quality bar:
Bad:
"DIY Paper Crafts — Create fun shapes and designs using paper and drawing tools."

Good:
"Secret Animal Passport Office — You are the passport officer for a hidden animal travel station. Choose three stuffed animals or drawn creatures, create passport cards for each one, decide where they are traveling, and stamp each passport with a marker symbol."

Bad:
"Creative Story Writing — Write a short story or poem using your imagination."

Good:
"Moon Base Message Mission — You are the communications officer on a moon base. Your job is to write three urgent messages: one to Earth, one to your robot helper, and one secret warning about a strange moon rock."

Bad:
"Indoor Treasure Hunt — Choose items and write clues."

Good:
"Lost Museum Exhibit — You are the museum curator. Pick five objects from the room, give each one a mysterious name, draw exhibit tags, and create a tour for your stuffed animals."
`;

        const input = `
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
- Activity mode: ${activityMode || "single-child"}
- Selected child profiles: ${formatChildProfilesForPrompt(
            safeSelectedChildProfiles
        )}
- Available toys/supplies by category: ${formatInventoryForPrompt(inventory)}
- Output style requirement: Make every activity feel like a detailed kid-facing quest with a theme, role, mission, starter prompts, first moves, roles when useful, and enough detail that the parent does not need to explain it. Do not return generic labels like "DIY Paper Crafts", "Creative Story Writing", or "Indoor Treasure Hunt".
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

Every activity object MUST include these fields: title, theme, summary, kidRole, mission, starterPrompts, firstMoves, steps, roles, extensionIdeas, uses, energy, mess, adultHelp, estimatedMinutes, whyItFits.

Return JSON in exactly this shape:

{
  "activities": [
    {
      "title": "Specific themed quest name",
      "theme": "A vivid one-sentence theme for the activity.",
      "summary": "Two sentence overview written directly to the child.",
      "kidRole": "The role the child plays in this quest.",
      "mission": "The clear goal the child is trying to complete.",
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
        "Detailed activity step 1.",
        "Detailed activity step 2.",
        "Detailed activity step 3.",
        "Detailed activity step 4.",
        "Detailed activity step 5."
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
}
`;

        const response = await client.responses.create({
            model: "gpt-5.4-mini",
            instructions,
            input,
            text: {
                format: {
                    type: "json_schema",
                    name: "activity_suggestions",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            activities: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        theme: { type: "string" },
                                        summary: { type: "string" },
                                        kidRole: { type: "string" },
                                        mission: { type: "string" },
                                        starterPrompts: {
                                            type: "array",
                                            items: { type: "string" },
                                        },
                                        firstMoves: {
                                            type: "array",
                                            items: { type: "string" },
                                        },
                                        steps: {
                                            type: "array",
                                            items: { type: "string" },
                                        },
                                        roles: {
                                            type: "array",
                                            items: { type: "string" },
                                        },
                                        extensionIdeas: {
                                            type: "array",
                                            items: { type: "string" },
                                        },
                                        uses: {
                                            type: "array",
                                            items: { type: "string" },
                                        },
                                        energy: {
                                            type: "string",
                                            enum: ["low", "medium", "high"],
                                        },
                                        mess: {
                                            type: "string",
                                            enum: ["low", "medium", "high"],
                                        },
                                        adultHelp: {
                                            type: "string",
                                            enum: ["none", "optional", "needed"],
                                        },
                                        estimatedMinutes: {
                                            type: "number",
                                        },
                                        whyItFits: { type: "string" },
                                    },
                                    required: [
                                        "title",
                                        "theme",
                                        "summary",
                                        "kidRole",
                                        "mission",
                                        "starterPrompts",
                                        "firstMoves",
                                        "steps",
                                        "roles",
                                        "extensionIdeas",
                                        "uses",
                                        "energy",
                                        "mess",
                                        "adultHelp",
                                        "estimatedMinutes",
                                        "whyItFits",
                                    ],
                                    additionalProperties: false,
                                },
                            },
                        },
                        required: ["activities"],
                        additionalProperties: false,
                    },
                },
            },
        });

        const rawText = response.output_text;

        // This prints the exact AI response in your backend terminal.
        // We need this to verify whether the model is returning the new quest fields.
        console.log("RAW AI RESPONSE:");
        console.log(rawText);

        const parsed = JSON.parse(rawText);

        // This prints the parsed JavaScript object after JSON.parse succeeds.
        console.log("PARSED AI RESPONSE:");
        console.log(JSON.stringify(parsed, null, 2));

        res.json(parsed);
    } catch (error) {
        console.error("AI suggestion error:", error);

        res.status(500).json({
            error: "Could not generate activity suggestions.",
        });
    }
});

app.post("/api/quest-step-hint", async (req, res) => {
    try {
        const {
            activeActivity,
            currentStep,
            currentStepNumber,
            totalSteps,
            currentMoment,
        } = req.body;

        if (!activeActivity || !currentStep) {
            return res.status(400).json({
                error: "Missing active activity or current step.",
            });
        }

        const safeCurrentMoment = currentMoment || {};

        const instructions = `
You are a gentle kid-facing play coach.

Your job is to give ONE small hint for the child's current quest step.

Rules:
- Return only valid JSON.
- Do not give a whole new activity.
- Do not rewrite the quest.
- Do not solve the entire step for the child.
- Give one small nudge that helps the child keep going.
- Use simple kid-friendly language.
- Keep it short: one or two sentences.
- Respect the current family moment.
- If the moment requires quiet, do not suggest loud actions.
- If the moment requires low mess, do not suggest messy materials.
- If the parent is unavailable, do not tell the child to ask the parent.
`;

        const input = `
Quest:
- Title: ${activeActivity.title || "Untitled quest"}
- Theme: ${activeActivity.theme || "Not specified"}
- Mission: ${activeActivity.mission || "Not specified"}

Current step:
- Step ${currentStepNumber || "?"} of ${totalSteps || "?"}: ${currentStep}

Current family moment:
- Parent activity: ${safeCurrentMoment.parentActivity || "Not specified"}
- Parent availability: ${safeCurrentMoment.availability || "Not specified"}
- Time needed: ${safeCurrentMoment.timeNeededMinutes || "Not specified"} minutes
- Space: ${safeCurrentMoment.space || "Not specified"}
- Mess level: ${safeCurrentMoment.messLevel || "Not specified"}
- Noise level: ${safeCurrentMoment.noiseLevel || "Not specified"}
- Supervision level: ${safeCurrentMoment.supervisionLevel || "Not specified"}

Return JSON in exactly this shape:

{
  "hint": "One short kid-friendly hint for the current step."
}
`;

        const response = await client.responses.create({
            model: "gpt-5.4-mini",
            instructions,
            input,
            text: {
                format: {
                    type: "json_schema",
                    name: "quest_step_hint",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            hint: {
                                type: "string",
                            },
                        },
                        required: ["hint"],
                        additionalProperties: false,
                    },
                },
            },
        });

        const rawText = response.output_text;
        const parsed = JSON.parse(rawText);

        res.json(parsed);
    } catch (error) {
        console.error("Quest step hint error:", error);

        res.status(500).json({
            error: "Could not generate quest step hint.",
        });
    }
});

function formatInventoryForPrompt(inventory) {
    if (!Array.isArray(inventory)) {
        return "No inventory provided.";
    }

    const normalizedInventory = inventory.map((item) => {
        if (typeof item === "string") {
            return {
                name: item,
                category: "Other",
            };
        }

        return {
            name: item.name || "Unnamed item",
            category: item.category || "Other",
        };
    });

    const groupedInventory = normalizedInventory.reduce((groups, item) => {
        if (!groups[item.category]) {
            groups[item.category] = [];
        }

        groups[item.category].push(item.name);

        return groups;
    }, {});

    return Object.entries(groupedInventory)
        .map(([category, items]) => `${category}: ${items.join(", ")}`)
        .join(" | ");
}

function formatChildProfilesForPrompt(childProfiles) {
    if (!Array.isArray(childProfiles) || childProfiles.length === 0) {
        return "No child profiles selected.";
    }

    return childProfiles
        .map((child) => {
            return `${child.name || "Unnamed child"} (${child.ageRange || "unknown age"
                }): interests=${child.interests || "not specified"}; notes=${child.needs || "not specified"
                }`;
        })
        .join(" | ");
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});