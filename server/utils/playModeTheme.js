// server/utils/playModeTheme.js

const PLAY_MODE_BY_THEME = {
  storybook: `
PLAY MODE — STORYBOOK:
- For younger kids (under ~10), richer narrative framing and light setup stories are welcome for imaginative activities.
- For ages 10+, prefer creative briefs and thinking challenges over long lore; optional light theme only.
- For ages 13+, do not push pretend story worlds — use design, strategy, invention, or puzzle framing instead.
- Keep real-world steps still simple and inventory-realistic.
- For simple activities, keep them plain but allow a slightly warmer tone.
`,
  workshop: `
PLAY MODE — WORKSHOP:
- Bias toward build, make, sort, fix, and assemble ideas that use listed inventory.
- Prefer concrete materials and clear maker steps.
- For imaginative activities under ~10, light pretend wrappers (workshop, invention lab) are OK.
- For ages 10+, treat imaginative as maker challenges and invention briefs — not costume roleplay.
- Keep mess realistic for the current moment.
`,
  playroom: `
PLAY MODE — PLAYROOM:
- Prefer short, start-now activities with quick first moves.
- Bias toward high-energy movement or playful bursts when the moment allows noise and energy.
- Keep steps few and immediate.
- For imaginative activities under ~10: start quickly BUT never skip the reason for the first action. Use 2–4 sentences of causal setup so the child knows WHY before acting. Short story ≠ shallow story.
- For ages 13+, punchy creative challenges beat pretend adventures.
`,
};

export function getPlayModePromptFlavor(theme) {
  return PLAY_MODE_BY_THEME[theme] || PLAY_MODE_BY_THEME.playroom;
}
