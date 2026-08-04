# Marketing demo recording

Record a deterministic walkthrough of the public `/demo` route (no OpenAI, no auth).

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
