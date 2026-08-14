# ActivCue marketing movie sequence

The landing-page movie should show the core imaginative ActivCue workflow only.

1. **Parent screen** — select **Cooking** as the current moment; hold the completed selection (~4s). Recording uses `/demo?record=1` so the parent screen stays until Continue.
2. **Ages screen** — keep the default age and continue (~1.2s).
3. **Kid screen** — choose energy (**Bouncy**) and keep **Imaginative** selected (~1.2s).
4. **Activity suggestions** — show exactly three imaginative recommendations, zoomed out so all cards fit; hold still (~5.5s).
5. **Start the story** — start from the card (no Details).
6. **Playbook scroll** — mild zoom, open at the absolute top (~1.75s), continuous scroll to the bottom (~11s), brief hold.

Do not include Simple mode, Plan B, Rescue Mode, completion, or extra help flows in this movie. Those are secondary product capabilities and distract from the core story.

Record with:

```bash
npm run demo:record
npm run demo:publish
```

Review `public/demos/activcue-demo.webm` before committing it.
