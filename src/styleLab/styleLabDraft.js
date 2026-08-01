// Development-only. Stores the Style Lab draft and applies it to <html>.

export const STYLE_LAB_DRAFT_KEY = "styleLabDraft";

export const EMPTY_DRAFT = {
  tokens: {},
  density: "",
  shape: "",
  pinned: false,
};

export function normalizeDraft(value) {
  if (!value || typeof value !== "object") {
    return EMPTY_DRAFT;
  }

  return {
    tokens:
      value.tokens && typeof value.tokens === "object" ? value.tokens : {},
    density: typeof value.density === "string" ? value.density : "",
    shape: typeof value.shape === "string" ? value.shape : "",
    pinned: value.pinned === true,
  };
}

export function applyDraft(draft) {
  const root = document.documentElement;
  const { tokens, density, shape } = normalizeDraft(draft);

  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });

  if (density) {
    root.dataset.density = density;
  } else {
    delete root.dataset.density;
  }

  if (shape) {
    root.dataset.shape = shape;
  } else {
    delete root.dataset.shape;
  }
}

export function clearDraftFromDocument(tokens) {
  const root = document.documentElement;

  Object.keys(tokens || {}).forEach((token) => {
    root.style.removeProperty(token);
  });

  delete root.dataset.density;
  delete root.dataset.shape;
}

// Called once at startup so a pinned draft survives a page reload and stays
// visible while browsing the real app.
export function applyPinnedDraft() {
  try {
    const stored = window.localStorage.getItem(STYLE_LAB_DRAFT_KEY);

    if (!stored) {
      return;
    }

    const draft = normalizeDraft(JSON.parse(stored));

    if (draft.pinned) {
      applyDraft(draft);
    }
  } catch (error) {
    console.error("Could not apply the pinned Style Lab draft:", error);
  }
}
