# Marketing demo recording

Two surfaces:

| Command | Surface | Purpose |
|---------|---------|---------|
| `npm run demo:record` | **Real app** (anon session) | Landing-page launch video |
| `npm run demo:record:playground` | Public `/demo` | Optional re-record of the interactive playground walkthrough |

Interactive playgrounds stay on `/` (`MomentDemo`) and `/demo` — no auth, no OpenAI. The landing **video** should show the real product.

## Real-app story (`demo:record`)

1. Landing → **Find something now**
2. Onboarding: add **Maya** (age 8)
3. Parent: **Cooking** → moment **Cooking dinner**
4. Kid: **Pretend** → **I'm Bored** → Quest board (Best fit + why)
5. **Details** → Overview / The world / Your Role / Starter Ideas
6. **Enter the story**
7. Check a starter idea → complete a step
8. **I'm stuck** / Stuck? (built-in help, no AI)
9. **Stop** back to recommendations
10. **Try the next best one** (Plan B)
11. End on landing **Find something now**

Uses free imaginative presets (no live OpenAI). Needs `npm run start:all` (Vite + API + Supabase anon auth).

## Playground story (`demo:record:playground`)

Deterministic `/demo` walkthrough (Maya + Making dinner, `% fit`, Didn't land?, etc.). See prior script comments in `landing-demo.spec.js`.

## Commands

```bash
# Record real-app launch video (1280×720 webm)
npm run demo:record

# Optional: re-record /demo playground only
npm run demo:record:playground

# Copy preferred recording into public/demos/
npm run demo:publish
```

Commit `public/demos/familyflow-demo.webm` when you want the landing video section to appear.

## Notes

- Uses `scripts/demo/playwright.demo.config.js` — separate from `npm run test:e2e`.
- Do **not** run this on Railway deploys.
- `demo:publish` prefers an `app-demo` webm when both recordings exist.
- Re-record after product UI changes; watch the video before committing.
- Cursor timing is intentionally slow for marketing clarity.
- Landing video is the **real app** recording (~1–2 minutes with pacing).
- Interactive `/demo` + MomentDemo remain the no-auth playground.
