import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export const UI_THEMES = [
  {
    id: "playroom",
    label: "Playroom",
    description: "Bold kid energy, bright colors",
  },
  {
    id: "workshop",
    label: "Workshop",
    description: "Craft table, cork and olive",
  },
  {
    id: "storybook",
    label: "Storybook",
    description: "Evening quiet, dramatic type",
  },
];

const THEME_IDS = new Set(UI_THEMES.map((theme) => theme.id));

export function normalizeUiTheme(value) {
  if (THEME_IDS.has(value)) {
    return value;
  }

  return "playroom";
}

export function useUiTheme() {
  const [storedTheme, setStoredTheme] = useLocalStorage("uiTheme", "playroom");
  const theme = normalizeUiTheme(storedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function setTheme(nextTheme) {
    setStoredTheme(normalizeUiTheme(nextTheme));
  }

  return {
    theme,
    setTheme,
    themes: UI_THEMES,
  };
}
