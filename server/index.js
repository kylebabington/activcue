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
            childAgeRange,
            feedbackContext,
            previousActivityTitles,
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

        const instructions = `
You are a family activity coach.

Generate safe, practical, creative activity ideas for kids.

Rules:
- Return only valid JSON.
- Give exactly 3 activities.
- Use the family's inventory when possible.
- Activities should be realistic at home.
- Avoid fire, sharp tools, chemicals, choking hazards, unsafe climbing, weapons, or unsupervised internet use.
- Respect the parent's availability.
- If the parent is busy or unavailable, suggest mostly independent activities.
- Use simple kid-friendly language.
- Do not guilt the parent.
- Do not suggest buying anything.
- Avoid repeating previous activity titles.
- Adapt to the feedback context.
`;

        const input = `
Family context:
- Parent is currently doing: ${parentActivity}
- Parent availability: ${parentAvailability}
- Kid mood/request: ${kidMood}
- Preferred mess level: ${messLevel}
- Preferred location: ${locationPreference}
- Child age range: ${childAgeRange}
- Available toys/supplies: ${inventory.join(", ")}
- Feedback context: ${safeFeedbackContext}
- Previous activity titles to avoid: ${safePreviousActivityTitles.join(", ")}

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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});