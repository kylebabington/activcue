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
You are a family activity coach.

Generate safe, practical, creative activity ideas for kids.

Rules:
- Return only valid JSON.
- Give exactly 3 activities.
- Use the family's inventory when possible.
- Pay attention to inventory categories. Use categories to combine items creatively, such as building toys plus pretend play, or art supplies plus household-safe items.
- Activities should be realistic at home.
- Respect the specific activity space. Do not suggest ideas that do not fit the selected room or place.
- Avoid fire, sharp tools, chemicals, choking hazards, unsafe climbing, weapons, or unsupervised internet use.
- Respect the parent's availability.
- If the parent is busy or unavailable, suggest mostly independent activities.
- Use simple kid-friendly language.
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
- Available toys/supplies by category: ${formatInventoryForPrompt(inventory)}
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
      "title": "Activity name",
      "summary": "One sentence summary.",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "uses": ["inventory item 1", "inventory item 2"],
      "energy": "low | medium | high",
      "mess": "low | medium | high",
      "adultHelp": "none | optional | needed",
      "whyItFits": "Short explanation."
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});