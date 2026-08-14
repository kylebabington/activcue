# Marketing demo recording

| Command | Surface | Purpose |
|---------|---------|---------|
| `npm run demo:record` | Public `/demo` | Landing-page launch video |
| `npm run demo:publish` | `public/demos/` | Copy the newest recording into the landing video path |

`/demo` is a deterministic walkthrough of the real ActivCue product flow (no auth, no OpenAI). See `REAL_PRODUCT_DEMO_FLOW.md` for the exact movie sequence.

## Story (`demo:record`)

1. Parent screen — select **Cooking**, hold completed selection (~4s)
2. Ages / Who's playing — brief hold (~1.2s), continue
3. Kid screen — energy (**Bouncy**), **Imaginative** (~1.2s)
4. Exactly three imaginative activity recommendations — zoomed out, still (~5.5s)
5. **Start the story** from the card
6. Open playbook at top (~1.75s), continuous scroll to bottom (~11s), brief end hold

Do not include Simple mode, Plan B, Rescue, completion, or extra help in this movie.

Do not include Simple mode, Plan B, Rescue, completion, or extra help in this movie.

## Commands

```bash
# Record the /demo product walkthrough (1280×720 webm)
npm run demo:record

# Copy the recording into public/demos/
npm run demo:publish
```

Commit `public/demos/activcue-demo.webm` when you want the landing video section to appear. `demo:publish` also updates `src/constants/demoVideo.js` so the landing page URL cache-busts after each new recording.

## Notes

- Uses `scripts/demo/playwright.demo.config.js` — separate from `npm run test:e2e`.
- Do **not** run this on Railway deploys.
- `demo:publish` prefers a `landing-demo` webm when both recordings exist.
- Re-record after product UI changes; watch the video before committing.
- Cursor timing is intentionally slow for marketing clarity.
