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

        if (!parentActivity || !parentAvailability || !kidMood) {
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

        const safeSafetySettings = safetySettings || {
            screenFreeOnly: true,
            noFoodActivities: false,
            noWaterPlay: true,
            noSmallObjects: true,
            quietMode: false,
            maxActivityMinutes: 30,
            adultHelpAllowed: "optional",
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

Rules:
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
- Parent is currently doing: ${parentActivity}
- Parent availability: ${parentAvailability}
- Kid mood/request: ${kidMood}
- Preferred mess level: ${messLevel}
- Preferred location: ${locationPreference}
- Specific activity space: ${activitySpace || "Not specified"}
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

Every activity object MUST include these fields: title, theme, summary, kidRole, mission, starterPrompts, firstMoves, steps, roles, extensionIdeas, uses, energy, mess, adultHelp, whyItFits.

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
      "whyItFits": "Specific explanation tied to child profile, activity space, safety settings, and inventory."
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