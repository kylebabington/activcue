// src/components/landing/MomentDemo.jsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { DEMO_MOMENT_LIST } from "../../constants/demoMoments";
import {
  matchDemoActivities,
  rotateDemoResults,
  MIN_DEMO_AGE,
  MAX_DEMO_AGE,
} from "../../features/demo";
import {
  getActivityMissionText,
  getVisualThemeMeta,
} from "../../utils/activityVisualTheme";
import { trackProductEvent } from "../../utils/analytics";

const PRIMARY_MOMENT_IDS = ["dinner", "workCall", "burnEnergy", "bedtime"];

const PRIMARY_MOMENTS = DEMO_MOMENT_LIST.filter((moment) =>
  PRIMARY_MOMENT_IDS.includes(moment.id)
);

const MORE_MOMENTS = DEMO_MOMENT_LIST.filter(
  (moment) => !PRIMARY_MOMENT_IDS.includes(moment.id)
);

const AGE_OPTIONS = Array.from(
  { length: MAX_DEMO_AGE - MIN_DEMO_AGE + 1 },
  (_, index) => MIN_DEMO_AGE + index
);

/**
 * Interactive moment-matching demo for the landing page.
 * Fully client-side — no AuthProvider, OpenAI, or writes.
 */
export default function MomentDemo({
  analyticsPrefix = "landing_demo",
} = {}) {
  const [momentId, setMomentId] = useState(null);
  const [showMoreMoments, setShowMoreMoments] = useState(false);
  const [childAges, setChildAges] = useState([8]);
  const [matchResult, setMatchResult] = useState(null);
  const [isMatching, setIsMatching] = useState(false);

  const visibleMoments = showMoreMoments
    ? [...PRIMARY_MOMENTS, ...MORE_MOMENTS]
    : PRIMARY_MOMENTS;

  function handleSelectMoment(id) {
    setMomentId(id);
    trackProductEvent(`${analyticsPrefix}_moment_selected`, { momentId: id });
  }

  function handleAgeChange(index, nextAge) {
    const clamped = Math.min(
      MAX_DEMO_AGE,
      Math.max(MIN_DEMO_AGE, Number(nextAge) || MIN_DEMO_AGE)
    );
    setChildAges((prev) =>
      prev.map((age, ageIndex) => (ageIndex === index ? clamped : age))
    );
  }

  function handleAddChild() {
    if (childAges.length >= 2) return;
    setChildAges((prev) => [...prev, 6]);
    trackProductEvent(`${analyticsPrefix}_age_toggled`, {
      childCount: childAges.length + 1,
    });
  }

  function handleRemoveSecondChild() {
    setChildAges((prev) => prev.slice(0, 1));
  }

  function runMatch({ rotate = false } = {}) {
    if (!momentId && !rotate) return;

    setIsMatching(true);
    window.setTimeout(() => {
      const next = rotate
        ? rotateDemoResults(matchResult, { childAges })
        : matchDemoActivities({ momentId, childAges, limit: 3 });
      setMatchResult(next);
      setIsMatching(false);
      trackProductEvent(
        rotate
          ? `${analyticsPrefix}_plan_b_clicked`
          : `${analyticsPrefix}_results_viewed`,
        {
          momentId: next.momentId,
          childAges: next.childAges,
          count: next.results.length,
          offset: next.offset,
        }
      );
    }, 450);
  }

  function handleFind() {
    if (!momentId) return;
    runMatch();
  }

  function handleTryAnother() {
    if (!matchResult) return;
    runMatch({ rotate: true });
  }

  const agesLabel =
    childAges.length === 1
      ? `age ${childAges[0]}`
      : `ages ${childAges.join(" & ")}`;

  return (
    <div className="moment-demo">
      <div className="moment-demo-intro">
        <h2 id="try-demo-title">See what FamilyFlow would pick</h2>
        <p className="moment-demo-lead">
          Set the moment and who&apos;s playing — then find three activities that
          fit right now.
        </p>
      </div>

      <div className="moment-demo-controls">
        <div className="moment-demo-field">
          <p className="moment-demo-label">What&apos;s happening?</p>
          <div
            className="moment-demo-moment-grid"
            role="group"
            aria-label="Moments"
          >
            {visibleMoments.map((moment) => {
              const selected = momentId === moment.id;
              return (
                <button
                  key={moment.id}
                  type="button"
                  className={
                    selected
                      ? "moment-demo-moment is-selected"
                      : "moment-demo-moment"
                  }
                  aria-pressed={selected}
                  onClick={() => handleSelectMoment(moment.id)}
                >
                  <strong>{moment.shortLabel || moment.label}</strong>
                </button>
              );
            })}
            {!showMoreMoments ? (
              <button
                type="button"
                className="moment-demo-moment moment-demo-moment--more"
                onClick={() => setShowMoreMoments(true)}
              >
                <strong>More…</strong>
              </button>
            ) : null}
          </div>
        </div>

        <div className="moment-demo-field">
          <p className="moment-demo-label">Kids playing</p>
          <div className="moment-demo-ages" role="group" aria-label="Child ages">
            {childAges.map((age, index) => (
              <label key={`child-age-${index}`} className="moment-demo-age">
                <span>Age</span>
                <select
                  value={age}
                  onChange={(event) =>
                    handleAgeChange(index, event.target.value)
                  }
                  aria-label={
                    childAges.length > 1
                      ? `Child ${index + 1} age`
                      : "Child age"
                  }
                >
                  {AGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {index === 1 ? (
                  <button
                    type="button"
                    className="moment-demo-age-remove"
                    onClick={handleRemoveSecondChild}
                    aria-label="Remove second child"
                  >
                    Remove
                  </button>
                ) : null}
              </label>
            ))}
            {childAges.length < 2 ? (
              <button
                type="button"
                className="moment-demo-add-child"
                onClick={handleAddChild}
              >
                + Add second child
              </button>
            ) : null}
          </div>
        </div>

        <div className="moment-demo-find-row">
          <button
            type="button"
            className="landing-btn landing-btn--primary"
            disabled={!momentId || isMatching}
            onClick={handleFind}
          >
            {isMatching ? "Finding…" : "Find activities"}
          </button>
        </div>
      </div>

      {!momentId ? (
        <p className="moment-demo-hint">
          Pick a moment, then find matching activities.
        </p>
      ) : null}

      {isMatching ? (
        <p className="moment-demo-status" role="status">
          Finding activities that fit…
        </p>
      ) : null}

      {!isMatching && matchResult ? (
        <div className="moment-demo-results">
          <div className="moment-demo-results-header">
            <h3>Three activities that fit</h3>
            <p>
              {agesLabel} · {matchResult.momentLabel}
            </p>
          </div>

          <ul className="moment-demo-card-list">
            {matchResult.results.map((entry) => {
              const activity = entry.activity;
              const theme = getVisualThemeMeta(activity.visualTheme);
              const mission = getActivityMissionText(activity);
              const why =
                entry.whyFitChips?.[0] ||
                entry.whyItFits ||
                mission ||
                activity.summary;
              return (
                <li key={activity.slug || activity.title}>
                  <div
                    className={`moment-demo-card activity-card--theme-${theme.key}`}
                    style={{ "--activity-theme-accent": theme.accent }}
                  >
                    <span className="moment-demo-card-fit">
                      {entry.fitPercent}% fit
                    </span>
                    <h4>{activity.title}</h4>
                    <p>{why}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="moment-demo-why">
            <button
              type="button"
              className="landing-btn landing-btn--ghost"
              onClick={handleTryAnother}
            >
              Didn&apos;t land? Try another
            </button>
          </div>
        </div>
      ) : null}

      <div className="moment-demo-cta-row">
        <Link
          className="landing-btn landing-btn--primary"
          to="/demo"
          onClick={() =>
            trackProductEvent(`${analyticsPrefix}_cta_clicked`, {
              source: "moment_demo",
            })
          }
        >
          Try the full demo
        </Link>
        <Link className="landing-btn landing-btn--ghost" to="/signup">
          Create free account
        </Link>
      </div>
    </div>
  );
}
