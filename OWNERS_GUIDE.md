# FamilyFlow — Owner’s Guide

This is the long-form explanation of FamilyFlow: what it is, why it is built this way, how each part works, and how to use it day to day. Read it like someone asked you to walk through the whole product with a whiteboard—not like API reference docs.

---

## 1. What this app is (and what it refuses to be)

**FamilyFlow** is a right-now activity helper for families. A parent names the moment they are in (“I’m cooking,” “I need quiet for twenty minutes”). A kid picks how they feel and whether they want simple play or pretend. The app returns activities that fit *this* room, *this* inventory, *this* supervision level—then guides the kid through starting and finishing.

It is deliberately **not**:

- A calendar of weekend plans
- A curriculum or school app
- A social network
- A generic “AI chatbot for kids”

The product bet is simple: **the hard problem is the next twenty minutes**, not the next month. If the first win is fast and trustworthy, parents come back. If the app asks them to configure a digital life first, they bounce.

### Free vs Plus (the intentional wedge)

| | Free | Plus |
|---|---|---|
| Account | Anonymous session is enough | Permanent account (email) for billing |
| Parent moment | Full | Full |
| Simple activities | Curated presets + local “Quick ideas” | Same + unlimited AI generation |
| Imaginative / pretend | One free unlock | Unlimited |
| AI step hints | No | Yes |
| Synced favorites / history / sessions | Moving to cloud memory | Same, richer with Plus usage |
| Personalization from outcomes | Local scoring signals | Same signals + AI that can use richer context |

Free exists so a tired parent can try the real loop without a sales pitch. Plus exists because OpenAI calls cost money and because “unlimited ideas for *this* moment” is the paid promise.

---

## 2. Why the architecture looks like this

### Two processes in development, one process in production

- **React + Vite** (`src/`) is the UI.
- **Express** (`server/`) is the API: auth-aware routes, Stripe, OpenAI, Supabase writes.

Locally you run both (`npm run start:all`). Vite serves the SPA on `:5173` and proxies `/api` to Express on `:3001`. In production you build the SPA into `dist/`, and Express serves `/api` *and* the static files from one origin. That avoids CORS headaches and matches how Railway/Render-style hosts usually work: one Node process, one `PORT`, reverse proxy in front.

### Why Supabase

Auth, Postgres, and row-level security live in Supabase so we do not invent accounts from scratch. The browser holds a **publishable** key. The server holds the **secret** key for privileged writes (family settings, subscriptions, memory tables). Clients are not trusted to update billing or entitlement state.

### Why anonymous auth exists

Parents should tap “Try the free flow” and be inside the app in seconds. `AuthProvider` either restores a session or calls `signInAnonymously()`. Later, signup **converts** that anonymous user into a permanent one so favorites and settings do not vanish. That conversion path is why email-check and complete-signup exist.

### Why so much still feels “App.jsx-shaped”

The app grew as a single product loop. Feature folders under `src/features/` (family, quest, activities, billing) are the start of carving ownership out of `App.jsx` without rewriting behavior. Prefer extracting with tests and unchanged UX over a big-bang refactor.

---

## 3. The mental model of a session

Think in four screens:

```text
Parent  →  Kid  →  Quest  →  Settings (as needed)
 moment     vibe    do it     inventory / account / Plus
```

1. **Parent** answers: What am I doing, how interruptible am I, how long, where, how messy/loud, how independent should this be?
2. **Kid** answers: Energy? Simple or imaginative? Then a start action.
3. **Quest** is where suggestions appear, an activity starts, a timer runs, steps advance, hints may appear, and completion/outcomes are recorded.
4. **Settings** is the durable setup: kids’ profiles, toys/supplies, safety rules, theme/play mode, PIN, billing.

Everything else—scoring, presets, AI prompts, Fit Score, Rescue Mode—is in service of that loop.

---

## 4. How to use the product (every surface)

### 4.1 Landing (`/`)

**What you see:** Brand-forward hero, short pitch, free vs Plus, “How it works.”

**How to use it:**

- **Try the free flow** → enters the authenticated app (`/app` and friends). An anonymous session is created if needed.
- **Log in / Create account** → permanent accounts for people who already converted or want Plus.

**Why it is thin:** The landing’s job is trust and one CTA—not a dashboard preview.

### 4.2 Login / Signup / Complete signup

| Page | Use it when |
|------|-------------|
| `/login` | Returning permanent user |
| `/signup` | Convert anonymous → email account (or create account) |
| `/complete-signup` | After email confirmation, set password |

**Why soft email checks:** Signup should not advertise whether an email is already registered in a harsh way. The server’s check-email path is intentionally gentle for conversion UX and privacy.

**Billing note:** Stripe Checkout requires a **permanent** account. Anonymous users who hit Upgrade are sent toward signup first (`ACCOUNT_REQUIRED`).

### 4.3 Parent (`/parent`)

**Purpose:** Define the *current moment* kids will play against.

**How to use it:**

1. Pick a built-in moment card (Cooking, Cleaning, Work call, …) or a custom saved moment.
2. Review/adjust fields in the modal: availability, minutes, space, mess, noise, supervision.
3. Confirm—moment becomes “live” for Kid and Quest scoring.
4. Optionally save custom moments for reuse.

**Rescue Mode (“I need 20 minutes”):**

- One tap sets an independent, low-mess, quiet, 20-minute moment and jumps to Kid.
- **Why:** When a parent is drowning, they will not configure six sliders. Rescue Mode is the honesty feature for real life.

**First-run coach:**

- On a new device, the app may highlight **Cooking** and nudge toward Kid → **I’m Bored**.
- Stored only in `localStorage` (`useFirstRunCoach`). It is onboarding, not server state.

**PIN gate:** Parent and Settings can be locked with a Parent PIN (still browser-local for MVP). Kid-facing paths stay reachable so a tablet can live in kid mode.

### 4.4 Kid (`/kid`)

**Purpose:** Kid-facing control surface—energy, style, start actions.

**How to use it:**

1. Set **energy** (calm / neutral / energetic).
2. Set **style** (simple vs imaginative).
3. Choose a start path:
   - **I’m Bored** — main path; demo uses presets; Plus can call AI.
   - **Quick ideas** — local simple templates (no OpenAI); good offline-ish / free fallback.
   - **Start for me** — auto-picks a strong option from current suggestions/presets.
4. Optionally **Play again** from recent liked/saved activities.
5. If multiple children exist, pick who is playing (playing-child chips when family mode / multi-kid is in play).

**Demo limits (free):**

- After the one free imaginative unlock is used, **I’m Bored** can disable until Plus—so free users are not silently burning empty AI calls.
- Banner copy explains upgrade without trapping Plus users: entitlement is not treated as “demo” until `/api/auth/me` has hydrated.

**Kid device mode:**

- Toggle in Settings (or open with `?kid=1`).
- Hides parent chrome (theme switcher / account clutter) so a hand-me-down phone feels like a kid device.
- **Why:** Same codebase, two postures—parent laptop vs kid tablet—without a second app.

**Play mode line:**

- The active **theme** (Playroom / Workshop / Storybook) also changes the kid-facing line and AI flavor. Themes are not only paint; they are play character.

### 4.5 Quest / Activity (`/quest`)

**Purpose:** Results → active activity → completion.

**How to use it:**

1. Browse suggested cards; open details; start one.
2. During an activity:
   - Timer counts down from the activity duration.
   - Simple activities use a simpler panel; imaginative uses steps, roles, mission/setup story.
   - Advance / complete steps; request an **AI hint** on Plus when stuck.
3. Finish or cancel.
4. On complete, optionally rate independence:
   - Worked great / Needed me a few times / Didn’t last  
   These outcomes feed **Fit Score** and session memory so the next ranking gets smarter.
5. Save favorites, request “more like this,” or clear and generate again.

**Why outcomes matter:** Without a cheap post-activity signal, “personalization” is theater. Independence × how long it lasted is a practical proxy for “did this buy the parent time?”

### 4.6 Settings (`/settings`)

Tabbed, PIN-aware. Rough map:

| Area | What to do there | Why it exists |
|------|------------------|---------------|
| **Preferences / Activity Rules** | Safety toggles and constraints the generator must respect | Keep AI and presets inside family norms |
| **Look & feel** | Theme (play mode), density/shape if exposed, **Kid device mode** | Same product, different atmosphere and device posture |
| **Inventory** | Check toys/supplies by category; add custom items | Soft inventory fit—prefer activities that use what you own |
| **History** | Saved activities + activity history panels | Replay and learning signals |
| **Account** | Child profiles (name, age range, interests, needs), session info, password | Multi-kid households and permanent accounts |
| **FamilyFlow Plus** | Upgrade, cancel at period end, resume | Entitlement and Stripe customer portal-ish flows in-app |
| **Parent PIN** | Set/clear PIN | Soft lock for parent areas on shared devices |
| **Danger zone** | Reset synced settings / local data | Escape hatch when state gets weird |

**What syncs to the cloud vs what stays local (current intent):**

- **Cloud (Supabase via API):** family settings document (children, inventory, safety, moment, custom presets, memory fields), Plus subscription rows, preset unlock on profile, activity memory tables/API.
- **Still local / device:** Parent PIN, UI theme selection, kid-device flag, first-run coach, active-quest scratch state as wired today.

When you change Settings, `useFamilySettings` debounces PUTs and guards against race conditions if the user switches accounts mid-save.

### 4.7 Style Lab (`/style-lab`, development only)

A live CSS-variable playground for `theme.css`. Use it to tune tokens, then paste values back into the design source. It is lazy-loaded and kept out of the production mental model—operators and designers use it; end users should not.

---

## 5. How suggestions are chosen (presets, AI, scoring)

### Paths into a list of activities

1. **Plus AI generation** — `POST /api/activity-suggestions` with moment, kids, inventory, safety, style, play-mode flavor. Structured output validated on the server.
2. **Preset library** — curated rows in `preset_activities` (simple always available; imaginative gated by Plus or one free unlock).
3. **Local quick templates** — deterministic simple ideas without OpenAI.

### Ranking (why the order is not random)

Utilities under `src/utils/` and `src/features/activities/` score candidates against:

- Current moment (time, mess, noise, supervision, space)
- Soft inventory match
- History / preference signals
- **Session Fit Score 2.0** — boosts or penalizes based on past session outcomes for similar activities

Then the UI can auto-pick the top score (“Start for me”) or let the kid choose.

### AI hints

`POST /api/quest-step-hint` is Plus-only, rate-limited, and logged to `ai_usage_events` so cost is visible later.

---

## 6. Project map (every major part)

### Repository layout

```text
family-activity-helper/
├── src/                 React SPA
├── server/              Express API + production static host
├── supabase/            SQL migrations + config
├── e2e/                 Playwright golden paths
├── scripts/             Preset generation / SQL emit tooling
├── public/              Static assets (logo, icons)
├── .github/workflows/   CI
├── OWNERS_GUIDE.md      This document
└── README.md            Short setup cheat sheet
```

### Frontend (`src/`)

| Area | Role |
|------|------|
| `App.jsx` | Product brain: moment, generation, quest lifecycle, entitlement hydrate, routing shell |
| `main.jsx` | Top-level routes: landing, auth pages, style lab, authenticated app |
| `pages/` | One job per route (Parent, Kid, Quest, Settings, Landing, auth) |
| `components/` | Active panels, results, moment modals, PIN gate, theme switcher |
| `features/family` | Durable settings hydrate/save |
| `features/quest` | Timer + finish/cancel helpers + independence outcomes |
| `features/activities` | Scoring / inventory fit barrel |
| `features/billing` | Checkout return polling + entitlement helpers |
| `api/` | Thin HTTP clients with auth headers |
| `hooks/` | Auth, localStorage, themes, kid device, first-run |
| `styles/` | `theme.css` tokens/skins → base → layout → components → pages |
| `utils/` | Scoring, fit score, play modes, formatters, analytics |
| `constants/` | Presets, inventory catalogs, family settings defaults |
| `context/` | App + Auth providers |
| `styleLab/` | Dev design lab |

### Backend (`server/`)

| Area | Role |
|------|------|
| `index.js` | Boot, env validation, Helmet CSP, CORS (dev), webhook raw body, route mounts, `dist/` SPA |
| `routes/auth.js` | `/me`, check-email |
| `routes/billing.js` | Checkout, cancel, resume, Stripe webhook |
| `routes/presetActivities.js` | List presets + free imaginative unlock |
| `routes/familySettings.js` | GET/PUT durable family document |
| `routes/familyMemory.js` | Saved activities, events, sessions |
| `routes/productEvents.js` | Allowlisted product analytics |
| `routes/account.js` | Permanent account deletion |
| `routes/activitySuggestions.js` | Paid AI generation |
| `routes/questStepHint.js` | Paid AI hints |
| `routes/health.js` | Deploy health check |
| `middleware/` | JWT auth, ensure profile, paid gate, rate limits |
| `lib/` | Supabase admin, Stripe, entitlements, subscriptions, webhook ledger, AI usage, OpenAI client |
| `prompts/` + `schemas/` | Prompt text and structured output contracts |
| `scripts/createSubscriptionProduct.js` | One-time Stripe product/price creation |

### Database (`supabase/migrations/`)

| Concern | Tables / changes |
|---------|------------------|
| Core product | `profiles`, `subscriptions`, `preset_activities` |
| Family document | `family_settings` (+ JSON memory columns) |
| First-class memory | `saved_activities`, `activity_events`, `activity_sessions` |
| Ops / safety | `stripe_webhook_events`, `ai_usage_events` (tokens, estimated cost, latency, failure type) |
| Product analytics | `product_events` (allowlisted names; no child notes/prompts) |
| Household sharing (foundation) | `households`, `household_members`; nullable `family_settings.household_id` future FK — children/inventory stay on `family_settings` until sharing UI ships |
| Billing nuance | `cancel_at_period_end` on subscriptions |

Migrations are the source of truth for other environments even if production already applied them.

**Household sharing note:** Schema only. Do not wire invite/share UI until product is ready; keep writing child profiles and inventory on the per-user `family_settings` row.

---

## 7. Auth, billing, and entitlement (how money and identity work)

### Session lifecycle

1. Enter app → anonymous or restored Supabase session.
2. Every API call sends `Authorization: Bearer <access_token>`.
3. Server validates JWT, ensures a `profiles` row exists.
4. Entitlement is derived from `subscriptions` (and period end), not from the client’s opinion.

### What “Plus” means in code

`server/lib/entitlements.js` roughly treats paid as: active/trialing (and not expired), or canceled-but-still-inside `current_period_end`. Cancel-at-period-end keeps access until the period finishes—important for trust.

Flags exposed to the client include `isPaid`, `canGenerateWithAi`, `canUseAiHints`.

### Stripe flows you must understand as owner

1. **Create checkout session** → redirect to Stripe → return to Settings/app with `?checkout=…`.
2. **`useCheckoutReturn`** polls entitlement and only clears the URL when status is final—so Plus unlocks without a blind refresh, and cancel returns a clean message.
3. **Webhooks** update subscription rows. Events are recorded in `stripe_webhook_events` so retries do not double-apply. Handlers retrieve the **current** subscription from Stripe before write to avoid out-of-order race damage.
4. Locally: `stripe listen --forward-to localhost:3001/api/billing/webhook` and put the `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

### Rate limits (why they exist)

AI is expensive and abusable. Per-user hourly limits on suggestions/hints, plus broader auth/billing limiters, protect the bill and the API. Exceeding returns an explicit rate-limit style error rather than mysterious failures.

---

## 8. Security and production posture

- **Helmet CSP** allowlists self, Stripe.js/frames/checkout, Supabase HTTP/WS, Google Fonts. CSP is real in production—not left disabled.
- **Trust proxy** is on so Express sees real client IPs behind Railway/Render for rate limiting.
- **Secrets** stay in host env / `server/.env` (gitignored). Rotate anything that ever leaked.
- **Parent PIN** is not cryptographic parental control; it is a shared-device courtesy lock until it moves server-side.
- **Service role** performs privileged DB writes; RLS is oriented so browsers cannot quietly rewrite billing or other users’ data.
- **Leaked Password Protection (Supabase Auth)** cannot be turned on from application code. In the Supabase Dashboard go to **Authentication → Attack Protection** (or **Providers → Email** security settings, depending on dashboard version) and enable **Leaked password protection** for each project (Test + production). Re-check after project restores.
- **Password reset redirect URLs** must include `{APP_URL}/reset-password` in Supabase Auth redirect allowlists.
- **Account deletion** is `DELETE /api/account` (permanent users only): clears family/memory/usage/product events, then `auth.admin.deleteUser`. Cancel Stripe in the Billing UI first when a subscription is active.

---

## 9. How to run and operate the project

### Prerequisites

- Node **24.x**
- Supabase project (URL + publishable + secret keys)
- OpenAI API key
- Stripe account with monthly/annual price IDs (and webhook secret for local or prod)
- Optional: Cloudflare Turnstile keys appear in examples for future bot defense; not required for the core loop today

### First-time setup

```bash
npm install
cp server/.env.example server/.env
cp .env.example .env   # if you use Vite env at repo root
```

Fill:

**Root / Vite**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

For Playwright / local E2E, prefer **local Supabase** (`npx supabase start`) and point Vite + server env at `http://127.0.0.1:54321`. Never point E2E at production. Anonymous sign-in is enabled in `supabase/config.toml` for the local stack.

**Server** (required at boot)

- `APP_URL` (e.g. `http://localhost:5173` locally)
- `OPENAI_API_KEY`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`
  (`STRIPE_WEBHOOK_SECRET` is required to boot—even locally—so billing webhooks cannot silently fail)
  Local E2E must use Stripe **test-mode** keys (`sk_test_…`).

Apply migrations to your hosted production project with `supabase db push`. Local `supabase start` applies the same migrations automatically.

One-time Stripe catalog helper (if prices are not created yet):

```bash
npm run create-subscription-product
```

### Daily commands

| Command | When |
|---------|------|
| `npm run start:all` | Normal local development |
| `npm run dev` | Frontend only |
| `npm run server` | API only |
| `npm run lint` | Before pushing |
| `npm test` | Unit/contract tests |
| `npm run build` | Production SPA into `dist/` |
| `npm run test:e2e` | Playwright (install browsers once: `npx playwright install`) |

Frontend: http://localhost:5173  
API: http://localhost:3001  
Health: `GET /api/health`

### Deploy shape (typical)

1. Set the same server env vars in the host dashboard.
2. Build frontend (`npm run build`).
3. Start `node server/index.js` (or `npm start`) so Express serves API + `dist/`.
4. Point Stripe webhooks at `https://<your-domain>/api/billing/webhook`.
5. Confirm `APP_URL` matches the public site URL used in Checkout redirects.

### CI

CI splits into:

1. **Lint, test, and build** — no cloud secrets
2. **Playwright e2e** — Chromium against **local Supabase** (`supabase start` on the runner)

E2E repository secrets (Stripe test + OpenAI only — no second Supabase cloud project):

- `TEST_STRIPE_SECRET_KEY` (must be `sk_test_…`)
- `TEST_STRIPE_WEBHOOK_SECRET`
- `TEST_STRIPE_MONTHLY_PRICE_ID`
- `TEST_STRIPE_ANNUAL_PRICE_ID`
- `TEST_OPENAI_API_KEY`

Local Supabase URL/keys are generated on the runner and must be `127.0.0.1` / `localhost`. Optional repo variable `FAMILYFLOW_BLOCKED_SUPABASE_HOSTS`: production Supabase hostnames Playwright must refuse. Production Supabase secret names are not wired into the E2E job.

---

## 10. How to use each subsystem as an owner/developer

### Changing copy or UX on a screen

Edit the page under `src/pages/` and shared pieces under `src/components/`. Keep **one job per section**. Parent is for moments; Kid is for start energy; Quest is for doing; Settings is for durable setup.

### Changing themes / play modes

1. Tokens and skins live in `src/styles/theme.css` (`data-theme`: playroom | workshop | storybook).
2. Kid line + AI flavor: `src/utils/playModeTheme.js` and `server/utils/playModeTheme.js` (keep them conceptually paired).
3. Experiment in Style Lab locally, then commit token changes deliberately.

### Changing what “fits” an activity

- Moment/inventory scoring: `src/utils/activityScoring.js`, `inventoryFit.js`
- Session learning: `src/utils/sessionFitScore.js`
- Prompt rules: `server/prompts/`

### Adding or regenerating presets

Use `scripts/` generators/emitters, then land SQL under `supabase/migrations/` (or seed updates). Presets are the free tier’s backbone—treat them as product content, not scrap.

### Touching billing

- Client: `src/api/billingApi.js`, `src/features/billing/`, Settings billing panel
- Server: `server/routes/billing.js`, `server/lib/entitlements.js`, `subscriptionStore.js`, webhook helpers
- Always think about: anonymous vs permanent, webhook order, cancel-at-period-end semantics

### Touching family sync / memory

- Hook: `src/features/family/useFamilySettings.js`
- Defaults/shape: `src/constants/familySettingsDefaults.js`
- HTTP: `familySettingsApi.js`, `familyMemoryApi.js`
- Server: `familySettings.js`, `familyMemory.js`

### Observability crumbs

- `src/utils/analytics.js` — product events (localStorage cache + authenticated `POST /api/product-events`)
- `ai_usage_events` — server-side AI call logging with tokens, estimated cost, latency, and failure type
- Consumer basics — `/forgot-password`, `/reset-password`, `/privacy`, `/terms`; Settings support mailto + delete account
- PWA — `public/manifest.webmanifest` + minimal `public/sw.js` app-shell cache

---

## 11. Design decisions worth defending (the “why” list)

1. **Moment-first, not profile-first** — Profiles help; the live moment decides.
2. **Free must complete the loop** — Presets + one imaginative unlock beat a locked demo video.
3. **Anonymous start, convert later** — Reduce signup friction; preserve continuity.
4. **Server-trusted entitlement** — Never let the client decide Plus.
5. **Idempotent webhooks + retrieve-current** — Stripe will retry; subscription rows must not lie.
6. **Rate limits + usage events** — Protect the OpenAI bill before scale surprises you.
7. **CSP on** — Checkout and auth load third parties; spell them in the policy.
8. **Rescue Mode** — Product honesty for stressed parents.
9. **Independence outcomes** — Cheap labels that train Fit Score.
10. **Themes as play modes** — Visual identity should change the *feel* of suggestions, not only hues.
11. **Kid device mode** — One app, two device postures.
12. **Extract features carefully** — Behavior stability beats folder purity.
13. **PIN is temporary** — Good enough for MVP shared tablets; not the final security story.

---

## 12. Day-in-the-life walkthrough (use this to demo)

1. Open the landing page → **Try the free flow**.
2. On Parent, tap **Rescue Mode** or pick **Cooking** and confirm.
3. On Kid, set energetic + simple (or imaginative once) → **I’m Bored**.
4. On Quest, start an activity, watch the timer, complete it.
5. Tap an independence outcome.
6. Open Settings → add a toy to inventory → set a child profile → flip theme to Storybook → try Kid again and notice the play-mode line.
7. Create an account, upgrade with Stripe test mode, confirm AI generation and hints unlock after checkout return—without a hard refresh.

If that path feels smooth, the product thesis is working.

---

## 13. When something breaks (owner triage)

| Symptom | Look first |
|---------|------------|
| Stuck “demo” while subscribed | `/api/auth/me`, webhook delivery, `subscriptions` row, checkout-return polling |
| AI 402 | Entitlement / `requirePaidSubscription` |
| AI rate limited | `rateLimits.js`, `ai_usage_events` |
| Settings not sticking | Network PUT `/api/family-settings`, user switch race, suppress/reset flags |
| Checkout won’t start when anonymous | Expected—convert account first |
| CSP / Stripe.js blocked | Helmet directives in `server/index.js` |
| Local API 404 from Vite | Is Express up? Proxy only works with both processes |
| Empty presets | Migrations/seed applied? Supabase keys correct? |

---

## 14. What “done” looks like for this codebase

You are not maintaining a pile of screens. You are maintaining a **loop**:

**Name the moment → match the kid → start something that fits → learn whether it bought time → do it again tomorrow.**

Every folder in this repo either runs that loop, monetizes that loop, or keeps that loop safe and operable. If a change does not serve one of those jobs, question it.

---

*This guide reflects FamilyFlow as implemented in this repository. Short setup commands also live in `README.md`; when they disagree, trust the code and update both.*
