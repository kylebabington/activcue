// Development-only page at /style-lab.
//
// Move the controls until the preview looks right, then copy the generated
// block into src/styles/theme.css. Nothing here ships to production.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import ThemeSwitcher from "../components/ThemeSwitcher.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useUiTheme } from "../hooks/useUiTheme.js";

import {
  ALL_CONTROLS,
  CONTROL_GROUPS,
  DENSITY_OPTIONS,
  FONT_OPTIONS,
  MODE_TOKENS,
  SHAPE_OPTIONS,
  formatRem,
  readToken,
  roundForDisplay,
  toHexColor,
  toRemNumber,
} from "./styleLabControls.js";
import {
  EMPTY_DRAFT,
  STYLE_LAB_DRAFT_KEY,
  applyDraft,
  clearDraftFromDocument,
  normalizeDraft,
} from "./styleLabDraft.js";

import "./styleLab.css";

function normalizeForCompare(value) {
  return String(value).replace(/\s+/g, " ").replace(/"/g, "'").trim().toLowerCase();
}

function matchOptionValue(options, value) {
  const target = normalizeForCompare(value);
  const match = options.find(
    (option) => option.value && normalizeForCompare(option.value) === target
  );

  return match ? match.value : "";
}

function selectOptionsFor(control) {
  const options = control.type === "font" ? FONT_OPTIONS : control.options;

  return [{ label: "Theme default", value: "" }, ...options];
}

function StyleLabPage() {
  const { theme: uiTheme, setTheme: setUiTheme, themes: uiThemes } = useUiTheme();
  const [storedDraft, setStoredDraft] = useLocalStorage(
    STYLE_LAB_DRAFT_KEY,
    EMPTY_DRAFT
  );

  const draft = useMemo(() => normalizeDraft(storedDraft), [storedDraft]);
  const [baseline, setBaseline] = useState({});
  const [copyState, setCopyState] = useState("");

  // Lets the baseline effect reach the current overrides without re-running
  // every time a slider moves.
  const tokensRef = useRef(draft.tokens);
  tokensRef.current = draft.tokens;

  useLayoutEffect(() => {
    applyDraft(draft);
  }, [draft]);

  // Baselines are the values the active theme and modes provide on their own,
  // so overrides come off the element while they are measured.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const overrides = tokensRef.current;

    Object.keys(overrides).forEach((token) => root.style.removeProperty(token));

    const measured = {};
    ALL_CONTROLS.forEach((control) => {
      measured[control.token] = readToken(control.token);
    });

    Object.entries(overrides).forEach(([token, value]) =>
      root.style.setProperty(token, value)
    );

    setBaseline(measured);
  }, [uiTheme, draft.density, draft.shape]);

  const pinnedRef = useRef(draft.pinned);
  pinnedRef.current = draft.pinned;

  // Leaving the lab cleans up, unless the draft is pinned for browsing the app.
  useEffect(
    () => () => {
      if (!pinnedRef.current) {
        clearDraftFromDocument(tokensRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!copyState) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopyState(""), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  function updateDraft(changes) {
    setStoredDraft((current) => ({ ...normalizeDraft(current), ...changes }));
  }

  function setToken(token, value) {
    setStoredDraft((current) => {
      const normalized = normalizeDraft(current);

      return {
        ...normalized,
        tokens: { ...normalized.tokens, [token]: value },
      };
    });
  }

  function resetToken(token) {
    setStoredDraft((current) => {
      const normalized = normalizeDraft(current);
      const nextTokens = { ...normalized.tokens };
      delete nextTokens[token];

      document.documentElement.style.removeProperty(token);

      return { ...normalized, tokens: nextTokens };
    });
  }

  function resetEverything() {
    clearDraftFromDocument(draft.tokens);
    setStoredDraft({ ...EMPTY_DRAFT, pinned: draft.pinned });
  }

  const lockedTokens = useMemo(() => {
    const locked = new Set();

    if (draft.density) {
      MODE_TOKENS.density.forEach((token) => locked.add(token));
    }

    if (draft.shape) {
      MODE_TOKENS.shape.forEach((token) => locked.add(token));
    }

    return locked;
  }, [draft.density, draft.shape]);

  const overrideCount = Object.keys(draft.tokens).length;

  const generatedCss = useMemo(() => {
    const lines = [];

    CONTROL_GROUPS.forEach((group) => {
      const changed = group.controls.filter(
        (control) => draft.tokens[control.token] !== undefined
      );

      if (changed.length === 0) {
        return;
      }

      if (lines.length > 0) {
        lines.push("");
      }

      lines.push(`  /* ${group.title.replace(/^\d+\.\s*/, "")} */`);
      changed.forEach((control) => {
        lines.push(`  ${control.token}: ${draft.tokens[control.token]};`);
      });
    });

    if (lines.length === 0 && !draft.density && !draft.shape) {
      return "/* Move a control and the CSS to paste shows up here. */";
    }

    const modeNote =
      draft.density || draft.shape
        ? `\n\n/* Modes on <html>:${draft.density ? ` data-density="${draft.density}"` : ""}${
            draft.shape ? ` data-shape="${draft.shape}"` : ""
          } */`
        : "";

    if (lines.length === 0) {
      return `/* Only mode changes so far. */${modeNote}`;
    }

    return [
      "/* Paste into src/styles/theme.css — :root for every theme,",
      `   or the [data-theme="${uiTheme}"] block for this skin only. */`,
      ":root {",
      ...lines,
      "}",
    ].join("\n") + modeNote;
  }, [draft.tokens, draft.density, draft.shape, uiTheme]);

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(generatedCss);
      setCopyState("Copied to the clipboard.");
    } catch (error) {
      console.error("Clipboard copy failed:", error);
      setCopyState("Copy failed — select the text below instead.");
    }
  }

  function renderControl(control) {
    const isOverridden = draft.tokens[control.token] !== undefined;
    const isLocked = lockedTokens.has(control.token);
    const baseValue = baseline[control.token] ?? "";
    const rawValue = isOverridden ? draft.tokens[control.token] : baseValue;

    return (
      <div
        key={control.token}
        className={
          isOverridden
            ? "style-lab-control style-lab-control--changed"
            : "style-lab-control"
        }
      >
        <div className="style-lab-control-head">
          <label htmlFor={`control-${control.token}`}>{control.label}</label>

          <div className="style-lab-control-meta">
            <code>{control.token}</code>
            {isOverridden && (
              <button
                type="button"
                className="style-lab-reset"
                onClick={() => resetToken(control.token)}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {isLocked && (
          <p className="style-lab-locked-note">
            A density or shape mode is setting this right now.
          </p>
        )}

        {control.type === "color" && (
          <div className="style-lab-color-row">
            <input
              id={`control-${control.token}`}
              type="color"
              value={toHexColor(rawValue)}
              onChange={(event) => setToken(control.token, event.target.value)}
            />
            <span className="style-lab-readout">{toHexColor(rawValue)}</span>
          </div>
        )}

        {(control.type === "length" || control.type === "number") && (
          <div className="style-lab-slider-row">
            <input
              id={`control-${control.token}`}
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={
                control.type === "length"
                  ? toRemNumber(rawValue, control.min)
                  : Number(parseFloat(rawValue) || 0)
              }
              onChange={(event) =>
                setToken(
                  control.token,
                  control.type === "length"
                    ? formatRem(event.target.value)
                    : String(roundForDisplay(event.target.value))
                )
              }
            />
            <span className="style-lab-readout">
              {control.type === "length"
                ? formatRem(toRemNumber(rawValue, control.min))
                : roundForDisplay(parseFloat(rawValue) || 0)}
            </span>
          </div>
        )}

        {(control.type === "font" || control.type === "select") && (
          <select
            id={`control-${control.token}`}
            value={
              isOverridden
                ? draft.tokens[control.token]
                : matchOptionValue(selectOptionsFor(control), baseValue)
            }
            onChange={(event) => {
              if (event.target.value === "") {
                resetToken(control.token);
                return;
              }

              setToken(control.token, event.target.value);
            }}
          >
            {selectOptionsFor(control).map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <div className="style-lab">
      <header className="style-lab-header">
        <div>
          <p className="style-lab-eyebrow">Development only</p>
          <h1>Style Lab</h1>
          <p className="style-lab-lede">
            Adjust until the preview looks right, then paste the generated CSS
            into <code>src/styles/theme.css</code>.
          </p>
        </div>

        <div className="style-lab-header-actions">
          <span className="style-lab-count">
            {overrideCount === 0
              ? "No overrides yet"
              : `${overrideCount} override${overrideCount === 1 ? "" : "s"}`}
          </span>

          <label className="style-lab-pin">
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(event) =>
                updateDraft({ pinned: event.target.checked })
              }
            />
            Keep applied while browsing the app
          </label>

          <button
            type="button"
            className="style-lab-button"
            onClick={resetEverything}
          >
            Reset all
          </button>
        </div>
      </header>

      <div className="style-lab-body">
        <section className="style-lab-controls" aria-label="Design controls">
          <div className="style-lab-group">
            <h2>Skin and modes</h2>
            <p className="style-lab-group-hint">
              These switch whole sets of tokens at once.
            </p>

            <div className="style-lab-control">
              <div className="style-lab-control-head">
                <label htmlFor="control-theme">Theme</label>
                <div className="style-lab-control-meta">
                  <code>data-theme</code>
                </div>
              </div>
              <select
                id="control-theme"
                value={uiTheme}
                onChange={(event) => setUiTheme(event.target.value)}
              >
                {uiThemes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} — {option.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="style-lab-control">
              <div className="style-lab-control-head">
                <label htmlFor="control-density">Density</label>
                <div className="style-lab-control-meta">
                  <code>data-density</code>
                </div>
              </div>
              <select
                id="control-density"
                value={draft.density}
                onChange={(event) =>
                  updateDraft({ density: event.target.value })
                }
              >
                {DENSITY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="style-lab-control">
              <div className="style-lab-control-head">
                <label htmlFor="control-shape">Shape</label>
                <div className="style-lab-control-meta">
                  <code>data-shape</code>
                </div>
              </div>
              <select
                id="control-shape"
                value={draft.shape}
                onChange={(event) => updateDraft({ shape: event.target.value })}
              >
                {SHAPE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {CONTROL_GROUPS.map((group) => (
            <div key={group.id} className="style-lab-group">
              <h2>{group.title}</h2>
              <p className="style-lab-group-hint">{group.hint}</p>
              {group.controls.map(renderControl)}
            </div>
          ))}

          <div className="style-lab-group">
            <h2>CSS to paste</h2>
            <p className="style-lab-group-hint">
              Only the values you changed appear here.
            </p>
            <button
              type="button"
              className="style-lab-button style-lab-button--primary"
              onClick={copyCss}
            >
              Copy CSS
            </button>
            {copyState && <p className="style-lab-copy-state">{copyState}</p>}
            <pre className="style-lab-output">{generatedCss}</pre>
          </div>
        </section>

        <section className="style-lab-preview" aria-label="Live preview">
          <div className="style-lab-preview-inner">
            <div className="panel panel--bordered">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Saturday morning</p>
                  <h2>Pick tonight&apos;s adventure</h2>
                  <p>
                    Panels, headings, and muted supporting text all read from
                    the same tokens you are moving.
                  </p>
                </div>
                <button type="button" className="ghost-button">
                  Edit
                </button>
              </div>

              <div className="chip-list">
                <button type="button" className="chip active">
                  Indoors
                </button>
                <button type="button" className="chip">
                  Backyard
                </button>
                <button type="button" className="chip">
                  Quiet
                </button>
                <button type="button" className="chip">
                  Messy
                </button>
              </div>

              <div className="fit-fact-chip-row">
                <span className="fit-fact-chip">25 minutes</span>
                <span className="fit-fact-chip">Ages 4–8</span>
                <span className="fit-fact-chip">Uses chalk</span>
              </div>

              <button type="button" className="generate-button">
                Generate activities
              </button>

              <div className="style-lab-button-row">
                <button type="button" className="secondary-action">
                  Save for later
                </button>
                <button type="button" className="ghost-button">
                  Shuffle
                </button>
                <button type="button" className="danger-button">
                  Remove
                </button>
              </div>

              <p className="settings-note">
                Small print uses the muted text color and the extra small size.
              </p>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Form controls</h2>
                  <p>Inputs inherit control height, radius, and border.</p>
                </div>
              </div>

              <label htmlFor="preview-name">Child&apos;s name</label>
              <input id="preview-name" type="text" defaultValue="Iris" />

              <label htmlFor="preview-energy">Energy level</label>
              <select id="preview-energy" defaultValue="medium">
                <option value="low">Winding down</option>
                <option value="medium">Steady</option>
                <option value="high">Bouncing</option>
              </select>

              <p className="status-message status-message--info">
                Saved automatically on this device.
              </p>
              <p className="status-message status-message--success">
                Activity added to tonight&apos;s plan.
              </p>
              <p className="status-message status-message--error">
                We could not reach the server.
              </p>
            </div>

            <div className="panel panel--bordered">
              <div className="panel-header">
                <div>
                  <h2>Theme switcher</h2>
                  <p>The real component, as it appears in Settings.</p>
                </div>
              </div>

              <ThemeSwitcher
                theme={uiTheme}
                onChange={setUiTheme}
                themes={uiThemes}
              />
            </div>

            <div className="modal-panel">
              <div className="modal-header">
                <h2>Modal</h2>
                <button
                  type="button"
                  className="modal-close-button"
                  aria-label="Close preview modal"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Modal width, padding, and radius come from{" "}
                  <code>--modal-width</code>, <code>--modal-padding</code>, and{" "}
                  <code>--radius-large</code>.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="ghost-button">
                  Cancel
                </button>
                <button type="button" className="generate-button">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StyleLabPage;
