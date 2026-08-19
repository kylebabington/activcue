import { VISUAL_THEMES } from "../schemas/activitySuggestionsSchema.js";

const VISUAL_THEME_SET = new Set(VISUAL_THEMES);

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function inferVisualThemeFromActivity(activity) {
  const raw = asString(activity.visualTheme).toLowerCase();
  if (VISUAL_THEME_SET.has(raw)) return raw;

  const haystack = [
    activity.story,
    activity.theme,
    activity.title,
    activity.summary,
    activity.mission,
    ...(Array.isArray(activity.categories) ? activity.categories : []),
  ]
    .join(" ")
    .toLowerCase();

  const guesses = [
    ["space", /space|moon|rocket|planet|star|orbit/],
    ["jungle", /jungle|forest|nature|tree|leaf/],
    ["detective", /detect|clue|mystery|case|spy/],
    ["animals", /animal|zoo|pet|creature|wildlife|shell|ocean|sea/],
    ["fantasy", /magic|dragon|wizard|fairy|castle|kingdom/],
    ["building", /build|construct|tower|block|fort/],
    ["science", /science|lab|experiment|robot|invent/],
    ["art", /art|draw|paint|comic|color|craft/],
    ["expedition", /expedition|explore|map|trek|voyage/],
    ["neighborhood", /neighbor|street|town|city|community/],
    ["rescue", /rescue|save|help|emergency/],
    ["mystery", /secret|hidden|strange|unknown|signal/],
  ];

  for (const [theme, pattern] of guesses) {
    if (pattern.test(haystack)) return theme;
  }

  return activity.activityStyle === "imaginative" ? "fantasy" : "art";
}
