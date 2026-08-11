# ActivCue — Portfolio Case Study

## Problem

Parents don’t need infinite activity ideas. They need something that fits **this** moment: cooking dinner, a short window, low mess, a specific child, inventory already at home—and they need the next idea if the first one dies.

## First prototype

A React app that collected a parent “moment,” called OpenAI for three activities, and showed a timer. Useful as a demo; weak as a product:

- Activities were free text with weak structure for learning
- Outcomes were mostly title strings and soft feedback
- Family mode blurred whose outcome counted
- Rejection was inferred; time-to-start lived only in the browser
- Every “try another” risked another paid API call

## Activity Content V2 and independent play

Generated imaginative activities now ship as **Activity Format V2**:

- `roleGuide` — who the child is, their job, and the first action
- `starterIdeas` — activity-level “how to begin” doors so kids pick a direction without asking an adult
- `stepDetails` — title, instruction, per-step `starterIdeas`, `doneWhen`, and built-in `ifStuck`
- Deterministic `visualTheme` accents (no AI images)

The quest UI leads with **The World → Your Role → Start Here**, then step cards. Built-in help is the default recovery path; AI hints are demoted to “Still stuck?” emergency fallback. Target: AI hints on &lt;5% of started activities.

Landing and `/onboarding` sell that same experience: problem-first hero, live Activity V2 preview, and a first activity as the reward—not a “setup complete” screen.

## Structured activity taxonomy

Every generated activity now carries:

- **categories** (building, creative, movement, pretend, …)
- **traits** (setupEffort, structure, socialMode, creativity, movement)

Energy, mess, adult help, duration, and supplies stay separate. Categories/traits flow generation → start → session → insights so the system can learn “open-ended building” instead of memorizing “Cardboard Castle.”

## Behavioral telemetry

Batches get `recommendation_batch_id`; activities get `candidate_id`. Events capture presented → selected → started → rejected/completed/abandoned, plus V2 funnel signals (`starter_idea_opened`, `built_in_help_opened`, `ai_hint_requested`). Time-to-start and rejection reasons become first-class signals, not guesses from titles.

## Fit Score 3.0

Ranking evolved from “we’ve had success with something like this activity” to:

> We’ve had success with something like this activity during circumstances like **right now**.

Moment similarity weights availability, supervision, space, noise, mess, duration, and mood. Historical value multiplies outcome × moment similarity × activity similarity × recency, with learned boost clamped to ±12.

## Shared library and cost reduction

AI outputs upsert into `shared_activity_candidates` (content-hash dedupe) with per-user impressions. Plan B ladder:

1. Unused candidates from the current batch (re-ranked for fast start)
2. Shared library pull for unseen compatible activities
3. Curated presets
4. Only then OpenAI regenerate

That cuts latency, spend, and parent frustration.

## Rescue Mode 2.0

One duration chip (10 / 20 / 30). No questionnaire. Low-setup pick with Plan B preloaded, biased by last successful moment when available.

## What Works for Us

Non-AI insights from sessions with minimum sample sizes. “Still learning” beats fake certainty.

## Payments and production

Stripe subscriptions with server-trusted entitlements, webhook idempotency, Express + Supabase deployment, rate limits, CSP, and Playwright against local Supabase.

## Unit economics

`ai_usage_events` records model, tokens, estimated cost, latency, and response id. Funnel analytics and library hit rate answer: cost per batch, cost per completed activity, and whether Plan B/Rescue actually reduce OpenAI spend per subscriber.
