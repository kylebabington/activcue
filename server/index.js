// server/index.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import { createOpenAIClient } from "./lib/openaiClient.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import billingRouter, {
  handleStripeWebhook,
} from "./routes/billing.js";
import presetActivitiesRouter from "./routes/presetActivities.js";
import familySettingsRouter from "./routes/familySettings.js";
import familyMemoryRouter from "./routes/familyMemory.js";
import createActivitySuggestionsRouter from "./routes/activitySuggestions.js";
import createQuestStepHintRouter from "./routes/questStepHint.js";

/*
 * ES modules do not automatically provide __filename and __dirname.
 *
 * We create them here so the server can reliably locate:
 *   1. server/.env during local development
 *   2. the React dist folder during production
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
 * Load the local server environment file.
 *
 * Local file:
 *   family-activity-helper/server/.env
 *
 * In production, Railway or Render supplies environment variables through
 * its dashboard. The deployed application does not need this file to exist.
 */
dotenv.config({
  path: path.join(__dirname, ".env"),
});

const app = express();
const PORT = process.env.PORT || 3001;

/*
 * Railway and Render place a reverse proxy in front of Express.
 *
 * This setting tells Express that the first proxy is trusted. That allows
 * req.ip, secure cookies, and future rate-limiting middleware to determine
 * the original visitor information correctly.
 *
 * Keep this directly after:
 *
 *   const app = express();
 */
app.set("trust proxy", 1);

/*
 * Add standard HTTP security headers, including a CSP tuned for FamilyFlow's
 * Supabase auth, Stripe Checkout, Google Fonts, and same-origin assets.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "script-src": ["'self'", "https://js.stripe.com"],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "img-src": ["'self'", "data:", "blob:", "https://*.stripe.com"],
        "connect-src": [
          "'self'",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://api.stripe.com",
        ],
        "frame-src": [
          "'self'",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
        ],
        "form-action": ["'self'", "https://checkout.stripe.com"],
      },
    },
  })
);

/*
 * During local development:
 *
 * React runs through Vite, usually at:
 *   http://localhost:5173
 *
 * Express runs at:
 *   http://localhost:3001
 *
 * Because those are different origins, development requires CORS.
 *
 * In production, React and Express will share one domain, so general CORS
 * access is unnecessary.
 */
if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: /^http:\/\/localhost:\d+$/,
    })
  );
}

/*
 * Confirm the server has the OpenAI key before creating the client.
 *
 * Local:
 *   family-activity-helper/server/.env
 *
 * Production:
 *   Add OPENAI_API_KEY in Railway or Render's environment-variable settings.
 */

/*
 * Validate all server runtime variables before accepting requests.
 */
const requiredServerEnvironmentVariables = [
  "APP_URL",
  "OPENAI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_MONTHLY_PRICE_ID",
  "STRIPE_ANNUAL_PRICE_ID",
];

const missingServerEnvironmentVariables =
  requiredServerEnvironmentVariables.filter(
    (variableName) =>
      !process.env[variableName]
  );

if (
  missingServerEnvironmentVariables.length > 0
) {
  console.error(
    [
      "The server cannot start because required environment variables are missing:",
      ...missingServerEnvironmentVariables.map(
        (variableName) =>
          `- ${variableName}`
      ),
      "",
      "Add them to server/.env locally or to Railway in production.",
    ].join("\n")
  );

  process.exit(1);
}

const client = createOpenAIClient();

/*
 * Stripe webhook must use the raw request body for signature verification.
 * Mount it before express.json().
 */
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

/*
 * Parse normal application requests as JSON.
 *
 * This applies to activity generation, quest hints, and most future API
 * endpoints.
 */
app.use(express.json());

/*
 * API ROUTES
 * ----------
 *
 * Every backend route must be registered before the React frontend fallback.
 */
/*
 * Public API route.
 *
 * The health endpoint must remain accessible to Railway without a user token.
 */
app.use("/api", healthRouter);

/*
 * Authentication inspection route.
 *
 * The router itself applies requireAuthenticatedUser to /auth/me.
 */
app.use("/api", authRouter);

/*
 * Stripe Checkout for FamilyFlow Plus.
 *
 * The webhook is mounted above (raw body). This router handles authenticated
 * create-checkout-session requests.
 */
app.use("/api", billingRouter);

/*
 * Preset activity browsing and unlock routes.
 *
 * These require a valid Supabase user but do not call OpenAI.
 */
app.use("/api", presetActivitiesRouter);

/*
 * Durable family settings (children, inventory, safety, moment, presets).
 *
 * Synced for anonymous and permanent users. Does not call OpenAI.
 */
app.use("/api", familySettingsRouter);

/*
 * First-class family memory: saved activities, events, and sessions.
 */
app.use("/api", familyMemoryRouter);

/*
 * Protected OpenAI routes.
 *
 * Their route files apply requireAuthenticatedUser before calling OpenAI.
 */
app.use("/api", createActivitySuggestionsRouter(client));
app.use("/api", createQuestStepHintRouter(client));

/*
 * API-ONLY 404
 * ------------
 *
 * Requests beginning with /api that do not match a real endpoint receive
 * JSON.
 *
 * This is intentionally scoped to "/api". It must not handle React routes.
 */
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API route not found.",
  });
});

/*
 * REACT PRODUCTION BUILD
 * ----------------------
 *
 * Running:
 *
 *   npm run build
 *
 * creates:
 *
 *   family-activity-helper/dist/
 *
 * Since this file is inside:
 *
 *   family-activity-helper/server/
 *
 * "../dist" moves up one directory and enters the Vite build folder.
 */
const clientDistPath = path.resolve(__dirname, "../dist");

/*
 * Serve JavaScript, CSS, images, fonts, and other files generated by Vite.
 */
app.use(express.static(clientDistPath));

/*
 * REACT ROUTER FALLBACK
 * ---------------------
 *
 * Any request that did not match an API endpoint or static file receives
 * React's index.html.
 *
 * This lets routes continue working when someone:
 *
 *   - refreshes a React page
 *   - bookmarks a React route
 *   - opens a React route directly
 *
 * This must remain after every /api route.
 */
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

/*
 * Start Express.
 *
 * Railway or Render supplies process.env.PORT.
 * Local development falls back to port 3001.
 */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});