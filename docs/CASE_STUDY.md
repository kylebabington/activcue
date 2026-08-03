# FamilyFlow — Case Study

**Activities that fit what your family can handle right now.**

FamilyFlow is a full-stack product I built end to end: React SPA, Express API, Supabase auth/Postgres, OpenAI generation, Stripe subscriptions, and Playwright CI against an isolated test project. This write-up is the interview version—problem, mistakes, architecture, and the engineering that had to be real.

---

## Problem

Parents do not need another weekend planner. They need the next twenty minutes to work.

A parent is cooking, on a call, or trying to get quiet. A kid is bored. The activity has to fit *this* room, *this* inventory, *this* mess/noise budget, and *this* supervision level—or the parent gets interrupted and the product fails.

The hard product question is not “what are fun ideas?” It is “what will this household actually survive right now?”

---

## Original mistake

Early on, everything became an imaginative quest.

The model was good at inventing stories, roles, and multi-step missions. That felt like an AI demo. It was a bad product default. Tired parents and younger kids often need something plain: blocks, drawing, a short independent task—not a theatrical adventure.

When every suggestion was pretend play, free users burned attention on the wrong shape of activity, and “AI” looked unreliable even when the prose was fine.

---

## Product decision: Simple vs Imaginative

Kids (or parents helping them) choose a **style** before generation:

| Style | Intent |
|-------|--------|
| **Simple** | Direct play with what you have; curated presets and local “Quick ideas” keep Free useful without OpenAI |
| **Imaginative** | Pretend / quest-shaped activities with steps, roles, and optional AI hints |

Free can complete the real loop: parent moment → kid vibe → start something → finish with an outcome. Presets plus one free imaginative unlock beat a locked demo. Plus unlocks unlimited AI generation and step hints.

That split is the product thesis in one control: generative flair is opt-in, not the only path.

---

## Architecture: AI proposes, deterministic code ranks

```text
Parent moment + kid energy/style + inventory/safety
                    │
                    ▼
         OpenAI structured suggestions
         (or presets / local templates)
                    │
                    ▼
     Deterministic scoring (moment, inventory,
     history, Session Fit Score)
                    │
                    ▼
         Ordered cards / “Start for me”
```

**Why this split matters**

- The model is good at *candidates* under soft constraints (age, materials, play mode flavor).
- The server validates structured output against schemas so bad JSON does not reach the UI.
- Ranking stays in code: time, mess, noise, supervision, space, soft inventory match, and past session outcomes.

**Fit Score** turns cheap post-activity labels (“worked great” / “needed me a few times” / “didn’t last”) into boosts and penalties for similar activities and contexts. Independence × how long it lasted is a practical proxy for “did this buy the parent time?” Without that loop, personalization is theater.

Entitlement for AI routes is enforced on the server (`requirePaidSubscription`). The client never decides Plus.

---

## Business: Free vs Plus

| | Free | Plus |
|---|---|---|
| Entry | Anonymous session is enough | Permanent email account for billing |
| Parent moment | Full | Full |
| Simple activities | Presets + local Quick ideas | Same + unlimited AI generation |
| Imaginative | One free unlock | Unlimited |
| AI step hints | No | Yes |
| Memory | Cloud favorites / history / sessions when signed in | Same, with richer AI usage |

Free exists so a tired parent can try the loop without a sales pitch. Plus exists because OpenAI calls cost money and “unlimited ideas for *this* moment” is the paid promise. Checkout requires a permanent account; anonymous users who hit Upgrade are steered to convert first.

---

## Engineering challenges

### 1. Anonymous auth → permanent conversion

Frictionless entry means `signInAnonymously()` on first visit. Signup must **convert** that same Supabase user to email/password so `family_settings`, favorites, and sessions do not vanish. That path includes soft email checks, complete-signup after confirmation, and careful profile `is_anonymous` updates. Billing refuses Checkout until the account is permanent—by design, not as a bug.

### 2. Stripe races and webhook ordering

Checkout return, client entitlement polling, and webhooks can arrive in any order. Mistakes here show up as “I paid but I’m still in demo.”

Mitigations in this codebase:

- Subscription state lives in Postgres; Plus is derived server-side from status and period end (including cancel-at-period-end still inside `current_period_end`).
- Webhook events are recorded for idempotency so Stripe retries do not double-apply.
- Handlers retrieve the **current** subscription from Stripe before writing, so an older event cannot overwrite newer truth.
- `useCheckoutReturn` polls entitlement and only clears URL state when status is final.

### 3. State sync across devices and accounts

Family settings debounce PUTs and guard against mid-save account switches. Favorites, activity events, and activity sessions moved toward first-class cloud tables (`saved_activities`, `activity_events`, `activity_sessions`) via `/api/family-memory/*`, instead of stuffing everything into one opaque JSON blob. Quest timer scratch state remains local—durable learning state is what syncs.

### 4. Fit Score as product logic, not prompt hope

Scoring utilities combine moment/inventory base scores with session history: independence outcomes, context similarity, duration reliability, failure signals, and recent repetition. The AI is not asked to “remember what worked”; the ranker is. That keeps behavior explainable and testable in Vitest.

### 5. Cloud-memory migration

Moving from local-only (or JSON-in-settings) memory to dedicated tables meant hydrate/merge paths, API contracts, and migrations that other environments must apply. The goal: signed-in households keep history across devices without trusting the browser as the source of truth for billing or entitlement.

### 6. E2E isolation

Playwright creates anonymous users and exercises golden paths. Pointing that at production would pollute real data and burn real keys. CI therefore:

- Splits **lint/test/build** (no cloud secrets) from **Playwright e2e**
- Injects only `TEST_*` repository secrets mapped to app env names at runtime
- Expects Stripe **test-mode** keys and local Supabase (`supabase start`) so CI never writes to the hosted production project
- Can refuse known production Supabase hosts via `FAMILYFLOW_BLOCKED_SUPABASE_HOSTS`

### 7. Rate limiting and CSP in production

AI routes have per-user hourly limits; auth and billing have their own limiters. Helmet CSP is on in production with explicit allowlists for Stripe Checkout/js, Supabase HTTP/WS, and fonts—because a “disable CSP to ship” shortcut would break the security story as soon as Checkout loads third parties.

---

## Stack (as shipped)

**React + Vite · Express · Supabase · OpenAI · Stripe · Playwright · Vitest**

Two processes in development; one Node process in production serving API + static SPA.

---

## What I would defend in an interview

1. Moment-first product, not profile-first configuration.
2. Simple vs Imaginative as a hard product control after the “everything is a quest” mistake.
3. AI proposes; deterministic code ranks and learns from outcomes.
4. Server-trusted entitlement and idempotent Stripe handling.
5. Anonymous start with conversion continuity.
6. CI that cannot silently use production secrets.

The loop the codebase exists to protect:

**Name the moment → match the kid → start something that fits → learn whether it bought time → do it again tomorrow.**
