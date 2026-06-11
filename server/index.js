import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createOpenAIClient } from "./lib/openaiClient.js";
import healthRouter from "./routes/health.js";
import createActivitySuggestionsRouter from "./routes/activitySuggestions.js";
import createQuestStepHintRouter from "./routes/questStepHint.js";

dotenv.config({ path: "./server/.env" });

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is not set. Copy server/.env.example to server/.env and add your key."
  );
  process.exit(1);
}

const client = createOpenAIClient();

app.use(
  cors({
    origin: /^http:\/\/localhost:\d+$/,
  })
);

app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", createActivitySuggestionsRouter(client));
app.use("/api", createQuestStepHintRouter(client));

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
