// Development-only. Describes which theme.css tokens the Style Lab exposes.
//
// Groups follow the tinkering order documented in src/index.css:
// personality, then spaciousness, then softness, then size.

export const FONT_OPTIONS = [
  { label: "Nunito — rounded and friendly", value: '"Nunito", system-ui, sans-serif' },
  { label: "Baloo 2 — playful display", value: '"Baloo 2", "Nunito", system-ui, sans-serif' },
  { label: "Source Sans 3 — plain and calm", value: '"Source Sans 3", system-ui, sans-serif' },
  { label: "DM Sans — modern geometric", value: '"DM Sans", system-ui, sans-serif' },
  { label: "Literata — bookish serif", value: '"Literata", Georgia, serif' },
  { label: "Cormorant Garamond — elegant serif", value: '"Cormorant Garamond", Georgia, serif' },
  { label: "System UI", value: "system-ui, sans-serif" },
];

const SHADOW_OPTIONS = [
  { label: "None (flat)", value: "none" },
  { label: "Small", value: "var(--shadow-small)" },
  { label: "Medium", value: "var(--shadow-medium)" },
  { label: "Large", value: "var(--shadow-large)" },
];

export const CONTROL_GROUPS = [
  {
    id: "personality",
    title: "1. Overall personality",
    hint: "Fonts and core colors decide the mood before anything else.",
    controls: [
      { token: "--font-body", label: "Body font", type: "font" },
      { token: "--font-heading", label: "Heading font", type: "font" },
      { token: "--color-primary", label: "Primary", type: "color" },
      { token: "--color-kid", label: "Kid accent", type: "color" },
      { token: "--color-warm", label: "Warm accent", type: "color" },
      { token: "--color-background", label: "Page background", type: "color" },
      { token: "--color-surface", label: "Card surface", type: "color" },
      { token: "--color-text", label: "Text", type: "color" },
      { token: "--color-text-muted", label: "Muted text", type: "color" },
    ],
  },
  {
    id: "spaciousness",
    title: "2. Spaciousness",
    hint: "How much air sits inside and between things.",
    controls: [
      { token: "--panel-padding", label: "Panel padding", type: "length", min: 0, max: 3, step: 0.05 },
      { token: "--card-padding", label: "Card padding", type: "length", min: 0, max: 3, step: 0.05 },
      { token: "--card-gap", label: "Gap between cards", type: "length", min: 0, max: 4, step: 0.05 },
      { token: "--button-padding-x", label: "Button padding — sides", type: "length", min: 0.25, max: 2.5, step: 0.05 },
      { token: "--button-padding-y", label: "Button padding — top/bottom", type: "length", min: 0.1, max: 1.5, step: 0.05 },
      { token: "--page-side-padding", label: "Page side padding", type: "length", min: 0, max: 3, step: 0.05 },
      { token: "--modal-padding", label: "Modal padding", type: "length", min: 0.25, max: 3, step: 0.05 },
    ],
  },
  {
    id: "softness",
    title: "3. Soft versus serious",
    hint: "Corner roundness and how much things float off the page.",
    controls: [
      { token: "--radius-small", label: "Radius — small", type: "length", min: 0, max: 2, step: 0.0625 },
      { token: "--radius-medium", label: "Radius — medium", type: "length", min: 0, max: 2.5, step: 0.0625 },
      { token: "--radius-large", label: "Radius — large", type: "length", min: 0, max: 3, step: 0.0625 },
      { token: "--radius-chip", label: "Radius — chips", type: "length", min: 0, max: 1.5, step: 0.0625 },
      { token: "--shadow-strength", label: "Shadow strength", type: "number", min: 0, max: 3, step: 0.05 },
      { token: "--panel-shadow", label: "Panel shadow", type: "select", options: SHADOW_OPTIONS },
      { token: "--card-shadow", label: "Card shadow", type: "select", options: SHADOW_OPTIONS },
    ],
  },
  {
    id: "size",
    title: "4. Size",
    hint: "Text scale, control height, and how wide a page may grow.",
    controls: [
      { token: "--font-size-base", label: "Text — base", type: "length", min: 0.75, max: 1.35, step: 0.005 },
      { token: "--font-size-sm", label: "Text — small", type: "length", min: 0.65, max: 1.2, step: 0.005 },
      { token: "--font-size-md", label: "Text — medium", type: "length", min: 0.8, max: 1.5, step: 0.005 },
      { token: "--font-size-lg", label: "Text — large", type: "length", min: 0.9, max: 2, step: 0.005 },
      { token: "--font-size-xl", label: "Text — extra large", type: "length", min: 1, max: 2.75, step: 0.005 },
      { token: "--control-height", label: "Control height", type: "length", min: 1.6, max: 3.5, step: 0.05 },
      { token: "--page-max-width", label: "Page max width", type: "length", min: 36, max: 90, step: 0.5 },
      { token: "--modal-width", label: "Modal width", type: "length", min: 18, max: 52, step: 0.5 },
    ],
  },
];

export const DENSITY_OPTIONS = [
  { value: "", label: "Default" },
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

export const SHAPE_OPTIONS = [
  { value: "", label: "Theme default" },
  { value: "rounded", label: "Rounded" },
  { value: "squared", label: "Squared" },
];

// Tokens a density or shape mode redefines. While a mode is active its tokens
// are shown as locked, because the mode wins over anything typed here.
export const MODE_TOKENS = {
  density: [
    "--panel-padding",
    "--card-padding",
    "--card-gap",
    "--modal-padding",
    "--button-padding-x",
    "--button-padding-y",
    "--control-height",
    "--page-side-padding",
  ],
  shape: ["--radius-small", "--radius-medium", "--radius-large", "--radius-chip"],
};

export const ALL_CONTROLS = CONTROL_GROUPS.flatMap((group) => group.controls);

export function readToken(token) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
}

export function toRemNumber(rawValue, fallback = 1) {
  const value = String(rawValue).trim();

  if (value.endsWith("rem")) {
    return parseFloat(value);
  }

  if (value.endsWith("px")) {
    return parseFloat(value) / 16;
  }

  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatRem(value) {
  return `${roundForDisplay(value)}rem`;
}

export function roundForDisplay(value) {
  return Number(Number(value).toFixed(4));
}

export function toHexColor(rawValue, fallback = "#000000") {
  const value = String(rawValue).trim();

  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return value.toLowerCase();
  }

  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  const channels = value.match(/-?[\d.]+%?/g);

  if (value.startsWith("rgb") && channels && channels.length >= 3) {
    return `#${channels
      .slice(0, 3)
      .map((channel) => {
        const number = channel.endsWith("%")
          ? (parseFloat(channel) / 100) * 255
          : parseFloat(channel);

        return Math.max(0, Math.min(255, Math.round(number)))
          .toString(16)
          .padStart(2, "0");
      })
      .join("")}`;
  }

  return fallback;
}
