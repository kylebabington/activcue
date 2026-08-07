# ActivCue marketing movie sequence

The landing-page movie should show the core imaginative ActivCue workflow only.

1. **Parent screen** — Cooking is visibly selected as the current moment.
2. **Kid screen** — show who is playing, choose an energy level, and keep **Pretend** selected.
3. **Activity suggestions** — show exactly three imaginative recommendations.
4. **Activity details** — open the real full-page details view for the first recommendation.
5. **Start the activity** — start from the details view.
6. **First step** — end the movie with Step 1 visible.

Do not include Simple mode, Plan B, Rescue Mode, completion, or extra help flows in this movie. Those are secondary product capabilities and distract from the core story.

Record with:

```bash
npm run demo:record
npm run demo:publish
```

Review `public/demos/activcue-demo.webm` before committing it.
