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
        origin: "http://localhost:5173",
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
You are a family activity scene designer and parent assistant.

Your job is not to give generic activity ideas.
Your job is to help a parent quickly set up a vivid, imaginative play scene that children can step into.

Think like:
- a camp counselor
- a children's museum exhibit designer
- a pretend-play director
- a parent who has 3 minutes to set up the scene and then needs the kids to continue independently

Rules:
- Return only valid JSON.
- Give exactly 3 activities.
- Each activity must feel like a specific play scenario, not a generic suggestion.
- The parent should be able to read the setup and quickly create the scene.
- Include a short parent setup script the parent can say out loud.
- Include specific child roles.
- If only one active child profile is provided, still give that child a role.
- If multiple child profiles are provided, give each child a different role when possible.
- Include setup materials using the family's inventory when possible.
- Pay attention to inventory categories. Use categories to combine items creatively, such as building toys plus pretend play, or art supplies plus household-safe items.
- Activities should be realistic at home.
- Respect the specific activity space. Do not suggest ideas that do not fit the selected room or place.
- Avoid fire, sharp tools, chemicals, choking hazards, unsafe climbing, weapons, or unsupervised internet use.
- Respect the parent's availability.
- If the parent is busy or unavailable, the parent setup must take 3 minutes or less and the activity should continue mostly independently.
- Use simple kid-friendly language.
- If an active child profile is provided, personalize ideas to that child's interests and helpful notes.
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
- Bad: "Create a treasure hunt using items around the house."
- Good: "Set up a Lost Library Rescue Mission where the child is a Junior Explorer finding missing animal clues hidden under pillows and books."
- Bad: "Build with LEGO."
- Good: "Set up a Mini City Emergency Crew where one child builds blocked roads and another delivers rescue supplies."
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
- Available toys/supplies by category: ${formatInventoryForPrompt(inventory)}
- Activity mode: ${activityMode || "single-child"}
- Selected child profiles: ${formatChildProfilesForPrompt(
            safeSelectedChildProfiles
        )}
- Available toys/supplies by category: ${formatInventoryForPrompt(inventory)}
- Output style requirement: Make every activity feel like a detailed kid-facing quest with theme ideas, starter prompts, first moves, roles when useful, and enough detail that the parent does not need to explain it.
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
  Return JSON in exactly this shape:

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
            model: "gpt-5.5-instant",
            instructions,
            input,
        });

        const rawText = response.output_text;
        const parsed = JSON.parse(rawText);

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
            return `${child.name || "Unnamed child"} (${child.ageRange || "unknown age"}): interests=${child.interests || "not specified"
                }; notes=${child.needs || "not specified"}`;
        })
        .join(" | ");
}

function formatChildProfilesForPrompt(childProfiles) {
    if (!Array.isArray(childProfiles) || childProfiles.length === 0) {
        return "No child profiles selected.";
    }

    return childProfiles
        .map((child) => {
            return `${child.name || "Unnamed child"} (${child.ageRange || "unknown age"}): interests=${child.interests || "not specified"
                }; notes=${child.needs || "not specified"}`;
        })
        .join(" | ");
}
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});