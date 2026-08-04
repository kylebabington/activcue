// src/pages/DemoPage.jsx

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QuestContent from "../components/quest/QuestContent";
import { getDefaultOpenSections } from "../components/quest/questSectionDefaults";
import { DEMO_MOMENT_LIST, getDemoMoment } from "../constants/demoMoments";
import { getDemoChild } from "../constants/demoChildren";
import { matchDemoActivities, rotateDemoResults } from "../features/demo";
import "../styles/landing.css";
import "../styles/demo.css";

/**
 * Public marketing /demo route — AI-free, no AuthProvider, no writes.
 * Stable target for Playwright marketing recordings.
 */
function DemoPage() {
  const [searchParams] = useSearchParams();
  const momentId = searchParams.get("moment") || "dinner";
  const childId = searchParams.get("child") || "maya";
  const activitySlug = searchParams.get("activity") || "";

  const baseMatch = useMemo(
    () => matchDemoActivities({ momentId, childId, limit: 3 }),
    [momentId, childId]
  );

  const [matchResult, setMatchResult] = useState(baseMatch);

  useEffect(() => {
    setMatchResult(baseMatch);
  }, [baseMatch]);

  const deepLinkedActivity = useMemo(() => {
    if (!activitySlug) return null;
    return (
      matchResult.rankedActivities.find(
        (activity) => activity.slug === activitySlug
      ) || null
    );
  }, [activitySlug, matchResult]);

  const [activity, setActivity] = useState(deepLinkedActivity);
  const [mode, setMode] = useState(
    searchParams.get("start") === "1" ? "active" : "preview"
  );
  const [openSections, setOpenSections] = useState(() =>
    getDefaultOpenSections({
      rescue: searchParams.get("stuck") === "1",
    })
  );
  const [checkedStarters, setCheckedStarters] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);

  useEffect(() => {
    setActivity(deepLinkedActivity);
    if (!activitySlug) {
      setMode("preview");
      setOpenSections(getDefaultOpenSections());
      setCheckedStarters([]);
      setCompletedSteps([]);
    }
  }, [deepLinkedActivity, activitySlug, momentId, childId]);

  useEffect(() => {
    if (activitySlug && searchParams.get("start") === "1") {
      setMode("active");
    }
    if (activitySlug && searchParams.get("stuck") === "1") {
      setOpenSections((prev) => ({ ...prev, rescue: true, steps: true }));
    }
  }, [activitySlug, searchParams]);

  const moment = getDemoMoment(momentId);
  const child = getDemoChild(childId);

  function handleTryAnother() {
    const next = rotateDemoResults(matchResult, { childId, momentId });
    setMatchResult(next);
    setActivity(null);
    setMode("preview");
    setOpenSections(getDefaultOpenSections());
    setCheckedStarters([]);
    setCompletedSteps([]);
  }

  function handleClose() {
    setActivity(null);
    setMode("preview");
    setOpenSections(getDefaultOpenSections());
    setCheckedStarters([]);
    setCompletedSteps([]);
  }

  return (
    <div className="landing demo-page">
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <Link className="landing-brand" to="/" aria-label="FamilyFlow home">
            <img
              className="landing-brand-mark"
              src="/logo.svg"
              alt=""
              width="36"
              height="36"
            />
            <span className="landing-brand-name">FamilyFlow</span>
          </Link>
          <div className="landing-topbar-actions">
            <Link className="landing-topbar-link" to="/">
              Back to landing
            </Link>
            <Link className="landing-topbar-cta" to="/onboarding">
              Find something now
            </Link>
          </div>
        </div>
      </header>

      <main className="demo-page-main">
        <section className="demo-page-hero" aria-labelledby="demo-title">
          <p className="landing-hero-brand">Interactive demo</p>
          <h1 id="demo-title">Activities that fit the moment</h1>
          <p className="demo-page-support">
            {child.name} · age {child.ageYears}. Moment: {moment.label}. No account,
            no AI calls — real Fit Score matching on curated presets.
          </p>
          <div className="demo-moment-links" aria-label="Demo moments">
            {DEMO_MOMENT_LIST.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                className={
                  item.id === momentId
                    ? "moment-demo-chip is-selected"
                    : "moment-demo-chip"
                }
                to={`/demo?moment=${item.id}&child=${childId}`}
              >
                {item.shortLabel}
              </Link>
            ))}
          </div>
          <div className="demo-moment-links" aria-label="Demo children">
            {["maya", "jack", "leo"].map((id) => {
              const profile = getDemoChild(id);
              return (
                <Link
                  key={id}
                  className={
                    id === childId
                      ? "moment-demo-chip is-selected"
                      : "moment-demo-chip"
                  }
                  to={`/demo?moment=${momentId}&child=${id}`}
                >
                  {profile.name} · {profile.ageYears}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="demo-page-results" aria-label="Matched activities">
          <ul className="moment-demo-card-list">
            {matchResult.results.map((entry) => (
              <li key={entry.activity.slug || entry.activity.title}>
                <button
                  type="button"
                  className="moment-demo-card"
                  onClick={() => {
                    setActivity(entry.activity);
                    setMode("preview");
                    setOpenSections(getDefaultOpenSections());
                    setCheckedStarters([]);
                    setCompletedSteps([]);
                  }}
                >
                  <span className="moment-demo-card-fit">
                    {entry.fitPercent}% fit
                  </span>
                  <h4>{entry.activity.title}</h4>
                  <p>{entry.activity.summary}</p>
                  <ul className="moment-demo-fit-chips">
                    {entry.whyFitChips.map((chip) => (
                      <li key={chip}>{chip}</li>
                    ))}
                  </ul>
                </button>
              </li>
            ))}
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
        </section>

        {activity ? (
          <section className="demo-page-quest" aria-label="Activity detail">
            <div className="moment-demo-detail-toolbar">
              <h2>{activity.title}</h2>
              <div className="moment-demo-detail-actions">
                {mode === "preview" ? (
                  <button
                    type="button"
                    className="landing-btn landing-btn--primary"
                    onClick={() => {
                      setMode("active");
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
                    onClick={() =>
                      setOpenSections((prev) => ({
                        ...prev,
                        rescue: true,
                        steps: true,
                      }))
                    }
                  >
                    Stuck?
                  </button>
                )}
                <button
                  type="button"
                  className="landing-btn landing-btn--ghost"
                  onClick={handleClose}
                >
                  Close
                </button>
              </div>
            </div>
            <QuestContent
              activity={activity}
              mode={mode}
              currentMoment={matchResult.moment}
              openSections={openSections}
              onSectionOpenChange={(key, nextOpen) =>
                setOpenSections((prev) => ({ ...prev, [key]: nextOpen }))
              }
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
          </section>
        ) : null}

        <section className="demo-page-final-cta">
          <h2>Here&apos;s something that works right now.</h2>
          <Link className="landing-btn landing-btn--primary" to="/onboarding">
            Find something now
          </Link>
        </section>
      </main>
    </div>
  );
}

export default DemoPage;
