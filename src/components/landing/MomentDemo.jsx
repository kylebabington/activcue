// src/components/landing/MomentDemo.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DEMO_MOMENT_LIST } from "../../constants/demoMoments";
import { DEMO_CHILDREN } from "../../constants/demoChildren";
import {
  matchDemoActivities,
  rotateDemoResults,
} from "../../features/demo";
import {
  getActivityMissionText,
  getActivityRoleLabel,
  getVisualThemeMeta,
} from "../../utils/activityVisualTheme";
import QuestContent from "../quest/QuestContent";
import { getDefaultOpenSections } from "../quest/questSectionDefaults";
import { trackProductEvent } from "../../utils/analytics";

const LANDING_MOMENTS = DEMO_MOMENT_LIST.filter((moment) =>
  ["dinner", "workCall", "burnEnergy", "meltdown", "rainyAfternoon"].includes(
    moment.id
  )
);

const LANDING_CHILDREN = [DEMO_CHILDREN.maya, DEMO_CHILDREN.jack];

function childKey(child) {
  if (child.id.includes("jack")) return "jack";
  if (child.id.includes("leo")) return "leo";
  return "maya";
}

/**
 * Interactive moment-matching demo for the landing page.
 * Fully client-side — no AuthProvider, OpenAI, or writes.
 */
export default function MomentDemo({
  showDetailInline = true,
  analyticsPrefix = "landing_demo",
} = {}) {
  const [childId, setChildId] = useState("maya");
  const [momentId, setMomentId] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [questMode, setQuestMode] = useState("preview");
  const [openSections, setOpenSections] = useState(() =>
    getDefaultOpenSections()
  );
  const [checkedStarters, setCheckedStarters] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);

  useEffect(() => {
    if (!momentId) return undefined;

    setIsMatching(true);
    setSelectedActivity(null);
    setQuestMode("preview");
    const timer = window.setTimeout(() => {
      const next = matchDemoActivities({ momentId, childId, limit: 3 });
      setMatchResult(next);
      setIsMatching(false);
      trackProductEvent(`${analyticsPrefix}_results_viewed`, {
        momentId,
        childId,
        count: next.results.length,
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [momentId, childId, analyticsPrefix]);

  function handleSelectMoment(id) {
    setMomentId(id);
    trackProductEvent(`${analyticsPrefix}_moment_selected`, { momentId: id });
  }

  function handleChildChange(nextId) {
    setChildId(nextId);
    trackProductEvent(`${analyticsPrefix}_age_toggled`, { childId: nextId });
  }

  function handleTryAnother() {
    if (!matchResult) return;
    const next = rotateDemoResults(matchResult, { childId });
    setMatchResult(next);
    setSelectedActivity(null);
    setQuestMode("preview");
    trackProductEvent(`${analyticsPrefix}_plan_b_clicked`, {
      momentId: next.momentId,
      offset: next.offset,
    });
  }

  function handleOpenActivity(activity) {
    setSelectedActivity(activity);
    setQuestMode("preview");
    setOpenSections(getDefaultOpenSections());
    setCheckedStarters([]);
    setCompletedSteps([]);
    trackProductEvent(`${analyticsPrefix}_activity_opened`, {
      title: activity?.title || "",
      momentId,
    });
  }

  function handleSectionOpenChange(key, nextOpen) {
    setOpenSections((prev) => ({ ...prev, [key]: nextOpen }));
  }

  return (
    <div className="moment-demo">
      <div className="moment-demo-intro">
        <h2 id="try-demo-title">Try FamilyFlow</h2>
        <p className="moment-demo-lead">
          Tell us what kind of chaos you&apos;re dealing with right now — then
          see three activities that fit. Unlock one complete activity free in
          the full demo.
        </p>
      </div>

      <div className="moment-demo-controls">
        <div className="moment-demo-field">
          <p className="moment-demo-label">Who&apos;s playing?</p>
          <div className="moment-demo-child-row" role="group" aria-label="Demo child">
            {LANDING_CHILDREN.map((child) => {
              const id = childKey(child);
              const selected = childId === id;
              return (
                <button
                  key={child.id}
                  type="button"
                  className={
                    selected
                      ? "moment-demo-chip is-selected"
                      : "moment-demo-chip"
                  }
                  aria-pressed={selected}
                  onClick={() => handleChildChange(id)}
                >
                  <strong>{child.name}</strong>
                  <span>Age {child.ageYears}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="moment-demo-field">
          <p className="moment-demo-label">What&apos;s happening?</p>
          <div className="moment-demo-moment-grid" role="group" aria-label="Moments">
            {LANDING_MOMENTS.map((moment) => {
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
                  <strong>{moment.label}</strong>
                  <span>{moment.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!momentId ? (
        <p className="moment-demo-hint">Pick a moment to see matching activities.</p>
      ) : null}

      {isMatching ? (
        <p className="moment-demo-status" role="status">
          Finding activities that fit…
        </p>
      ) : null}

      {!isMatching && matchResult ? (
        <div className="moment-demo-results">
          <div className="moment-demo-results-header">
            <h3>Great. Here are three activities that fit:</h3>
            <p>
              {matchResult.child.name} · age {matchResult.childAgeYears} ·{" "}
              {matchResult.momentLabel}
            </p>
          </div>

          <ul className="moment-demo-card-list">
            {matchResult.results.map((entry) => {
              const activity = entry.activity;
              const theme = getVisualThemeMeta(activity.visualTheme);
              const role = getActivityRoleLabel(activity);
              const mission = getActivityMissionText(activity);
              return (
                <li key={activity.slug || activity.title}>
                  <button
                    type="button"
                    className={`moment-demo-card activity-card--theme-${theme.key}`}
                    style={{ "--activity-theme-accent": theme.accent }}
                    onClick={() => handleOpenActivity(activity)}
                  >
                    <span className="moment-demo-card-fit">
                      {entry.fitPercent}% fit
                    </span>
                    <h4>{activity.title}</h4>
                    <p>{mission || activity.summary}</p>
                    <p className="moment-demo-card-role">
                      You are <strong>{role}</strong>
                    </p>
                    <ul className="moment-demo-fit-chips">
                      {entry.whyFitChips.map((chip) => (
                        <li key={chip}>{chip}</li>
                      ))}
                    </ul>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="moment-demo-why">
            <h4>Why these fit</h4>
            <p>
              Matched with FamilyFlow&apos;s real Fit Score — time, mess, noise,
              supervision, and age — not a random list.
            </p>
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

      {showDetailInline && selectedActivity ? (
        <div className="moment-demo-detail" id="moment-demo-detail">
          <div className="moment-demo-detail-toolbar">
            <h3>{selectedActivity.title}</h3>
            <div className="moment-demo-detail-actions">
              {questMode === "preview" ? (
                <button
                  type="button"
                  className="landing-btn landing-btn--primary"
                  onClick={() => {
                    setQuestMode("active");
                    setOpenSections(
                      getDefaultOpenSections({
                        starters: true,
                        steps: true,
                        rescue: false,
                      })
                    );
                  }}
                >
                  Start activity
                </button>
              ) : (
                <button
                  type="button"
                  className="landing-btn landing-btn--ghost"
                  onClick={() => setQuestMode("preview")}
                >
                  Back to overview
                </button>
              )}
              <button
                type="button"
                className="landing-btn landing-btn--ghost"
                onClick={() => setSelectedActivity(null)}
              >
                Close
              </button>
            </div>
          </div>

          <QuestContent
            activity={selectedActivity}
            mode={questMode}
            currentMoment={matchResult?.moment}
            openSections={openSections}
            onSectionOpenChange={handleSectionOpenChange}
            checkedStarterIndexes={checkedStarters}
            completedStepIndexes={completedSteps}
            onToggleStarter={(index) => {
              setCheckedStarters((prev) =>
                prev.includes(index)
                  ? prev.filter((item) => item !== index)
                  : [...prev, index]
              );
            }}
            onToggleStep={(index) => {
              setCompletedSteps((prev) =>
                prev.includes(index)
                  ? prev.filter((item) => item !== index)
                  : [...prev, index]
              );
            }}
            canUseAiHints={false}
          />
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
