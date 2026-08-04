# Marketing demo recording

Record a deterministic walkthrough of the public `/demo` route (no OpenAI, no auth).

## Story the video should show

1. Choose child (Maya) and moment (Making dinner)
2. Three Fit Score match cards with why-fit chips
3. Open an activity — Overview, Your Role, Starter Ideas
4. Start activity → check a starter idea → complete a step
5. Open built-in Stuck? help (no AI call)
6. Close back to recommendations
7. Didn't land? Try another (Plan B)
8. End on Find something now

## Commands

```bash
# Start Vite if needed, then record (1280×720 webm via Playwright)
npm run demo:record

# Copy newest recording into public/demos/
npm run demo:publish
```

Commit `public/demos/familyflow-demo.webm` (and optional poster) when you want the landing video section to appear.

## Notes

- Uses `scripts/demo/playwright.demo.config.js` — separate from `npm run test:e2e`.
- Do **not** run this on Railway deploys.
- Re-record after landing/`/demo` UI changes; review the video before committing.
- Cursor timing is intentionally slow for marketing clarity.
- Target runtime is under a minute (landing copy: “under a minute”).
