// src/utils/playModeTheme.js

const PLAY_MODE_BY_THEME = {
  storybook: {
    id: "storybook",
    label: "Storybook mode",
    uiLine: "Storybook mode: longer pretend setups.",
    promptFlavor: `
PLAY MODE — STORYBOOK:
- Prefer richer narrative framing and longer setup stories for imaginative activities.
- Lean into roles, missions, and atmospheric themes.
- Keep real-world steps still simple and inventory-realistic.
- For simple activities, keep them plain but allow a slightly warmer tone.
`,
  },
  workshop: {
    id: "workshop",
    label: "Workshop mode",
    uiLine: "Workshop mode: build-from-inventory first.",
    promptFlavor: `
PLAY MODE — WORKSHOP:
- Bias toward build, make, sort, fix, and assemble ideas that use listed inventory.
- Prefer concrete materials and clear maker steps.
- For imaginative activities, wrap building in light pretend (workshop, invention lab, repair crew).
- Keep mess realistic for the current moment.
`,
  },
  playroom: {
    id: "playroom",
    label: "Playroom mode",
    uiLine: "Playroom mode: short high-energy bursts.",
    promptFlavor: `
PLAY MODE — PLAYROOM:
- Prefer short, start-now activities with quick first moves.
- Bias toward high-energy movement or playful bursts when the moment allows noise and energy.
- Keep steps few and immediate.
- For imaginative activities, use punchy themes rather than long lore.
`,
  },
};

export function getPlayModeForTheme(theme) {
  return PLAY_MODE_BY_THEME[theme] || PLAY_MODE_BY_THEME.playroom;
}

export function getPlayModePromptFlavor(theme) {
  return getPlayModeForTheme(theme).promptFlavor;
}

export function getPlayModeUiLine(theme) {
  return getPlayModeForTheme(theme).uiLine;
}
