// server/utils/playModeTheme.js

const PLAY_MODE_BY_THEME = {
  storybook: `
PLAY MODE — STORYBOOK:
- Prefer richer narrative framing and longer setup stories for imaginative activities.
- Lean into roles, missions, and atmospheric themes.
- Keep real-world steps still simple and inventory-realistic.
- For simple activities, keep them plain but allow a slightly warmer tone.
`,
  workshop: `
PLAY MODE — WORKSHOP:
- Bias toward build, make, sort, fix, and assemble ideas that use listed inventory.
- Prefer concrete materials and clear maker steps.
- For imaginative activities, wrap building in light pretend (workshop, invention lab, repair crew).
- Keep mess realistic for the current moment.
`,
  playroom: `
PLAY MODE — PLAYROOM:
- Prefer short, start-now activities with quick first moves.
- Bias toward high-energy movement or playful bursts when the moment allows noise and energy.
- Keep steps few and immediate.
- For imaginative activities, use punchy themes rather than long lore.
`,
};

export function getPlayModePromptFlavor(theme) {
  return PLAY_MODE_BY_THEME[theme] || PLAY_MODE_BY_THEME.playroom;
}
