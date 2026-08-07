// src/pages/DemoPage.jsx

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { readDemoUnlockCache } from "../api/demoApi";
import ActivityResults from "../components/ActivityResults";
import QuestContent from "../components/quest/QuestContent";
import { getDefaultOpenSections } from "../components/quest/questSectionDefaults";
import { DEMO_ACTIVITY_POOL } from "../constants/demoActivityPool";
import { DEMO_MOMENT_LIST } from "../constants/demoMoments";
import {
  MAX_DEMO_AGE,
  MIN_DEMO_AGE,
  matchDemoActivities,
  rotateDemoResults,
} from "../features/demo";
import {
  buildDemoUnlockSignupUrl,
  buildSignupUrl,
} from "../utils/signupUrls";
import { captureAttribution, trackProductEvent } from "../utils/analytics";
import "../App.css";
import "../styles/landing.css";
import "../styles/demo.css";

const PLUS_SIGNUP_URL = buildSignupUrl({
  next: "checkout",
  plan: "monthly",
});

const ENERGY_OPTIONS = [
  { id: "low", label: "Low energy" },
  { id: "neutral", label: "Just right" },
  { id: "high", label: "Need to move" },
];

const STYLE_OPTIONS = [
  { id: "simple", label: "Something simple" },
  { id: "imaginative", label: "Pretend / imaginative" },
];

function DemoBanner({ unlockUsed, onReset }) {
  return (
    <aside className="demo-sticky-banner" aria-label="Demo status">
      <div className="demo-sticky-banner-copy">
        <strong>You&apos;re trying FamilyFlow</strong>
        <p>
          Same activity cards as the app, with a preview of what fits — not the
          full steps.{" "}
          {unlockUsed
            ? "Create an account (or Plus) for more pretend activities."
            : "Create a free account to unlock one pretend activity."}
        </p>
      </div>
      <div className="demo-sticky-banner-actions">
        {unlockUsed ? (
          <Link className="landing-btn landing-btn--primary" to={PLUS_SIGNUP_URL}>
            Get unlimited with Plus
          </Link>
        ) : (
          <Link className="landing-btn landing-btn--primary" to="/signup">
            Create free account
          </Link>
        )}
        {typeof onReset === "function" ? (
          <button
            type="button"
            className="landing-btn landing-btn--ghost"
            onClick={onReset}
          >
            Start over
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function MomentStep({ momentId, onSelect }) {
  return (
    <section className="demo-step" aria-labelledby="demo-moment-title">
      <p className="demo-screen-kicker">Step 1</p>
      <h1 id="demo-moment-title">What&apos;s happening right now?</h1>
      <p className="demo-step-lead">
        Pick a parent moment — the same presets you&apos;ll use in the app.
      </p>
      <div className="demo-moment-grid preset-grid preset-grid--dense" role="group" aria-label="Moments">
        {DEMO_MOMENT_LIST.map((moment) => {
          const selected = momentId === moment.id;
          return (
            <button
              key={moment.id}
              type="button"
              className={
                selected
                  ? "preset-card active demo-moment-card is-selected"
                  : "preset-card demo-moment-card"
              }
              aria-pressed={selected}
              onClick={() => onSelect(moment.id)}
            >
              <strong>{moment.shortLabel || moment.label}</strong>
              <small>{moment.description}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AgesStep({ ages, onChangeAge, onAddChild, onRemoveChild, onContinue }) {
  return (
    <section className="demo-step" aria-labelledby="demo-ages-title">
      <p className="demo-screen-kicker">Step 2</p>
      <h1 id="demo-ages-title">Who&apos;s playing?</h1>
      <p className="demo-step-lead">
        Ages only — no names, profiles, or accounts. Up to two kids.
      </p>
      <div className="demo-ages-row">
        {ages.map((age, index) => (
          <div key={`age-${index}`} className="demo-age-card">
            <p className="demo-age-label">
              {ages.length === 1 ? "Child" : `Child ${index + 1}`}
            </p>
            <div className="demo-age-stepper">
              <button
                type="button"
                aria-label={`Decrease age for child ${index + 1}`}
                onClick={() =>
                  onChangeAge(index, Math.max(MIN_DEMO_AGE, age - 1))
                }
              >
                −
              </button>
              <span aria-live="polite">{age}</span>
              <button
                type="button"
                aria-label={`Increase age for child ${index + 1}`}
                onClick={() =>
                  onChangeAge(index, Math.min(MAX_DEMO_AGE, age + 1))
                }
              >
                +
              </button>
            </div>
            {ages.length > 1 ? (
              <button
                type="button"
                className="demo-age-remove"
                onClick={() => onRemoveChild(index)}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {ages.length < 2 ? (
        <button
          type="button"
          className="landing-btn landing-btn--ghost"
          onClick={onAddChild}
        >
          + Add another child
        </button>
      ) : null}
      <button
        type="button"
        className="landing-btn landing-btn--primary demo-step-continue"
        onClick={onContinue}
      >
        Continue
      </button>
    </section>
  );
}

function KidStep({
  energy,
  style,
  onEnergy,
  onStyle,
  onContinue,
  onBack,
}) {
  return (
    <section className="demo-step" aria-labelledby="demo-kid-title">
      <p className="demo-screen-kicker">Step 3</p>
      <h1 id="demo-kid-title">How do you feel?</h1>
      <p className="demo-step-lead">
        Parent set the moment. Kids add energy and style — FamilyFlow finds the
        intersection.
      </p>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Energy</p>
        <div className="demo-chip-row" role="group" aria-label="Energy">
          {ENERGY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                energy === option.id
                  ? "demo-choice-chip is-selected"
                  : "demo-choice-chip"
              }
              aria-pressed={energy === option.id}
              onClick={() => onEnergy(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Style</p>
        <div className="demo-chip-row" role="group" aria-label="Style">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                style === option.id
                  ? "demo-choice-chip is-selected"
                  : "demo-choice-chip"
              }
              aria-pressed={style === option.id}
              onClick={() => onStyle(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="demo-step-actions">
        <button
          type="button"
          className="landing-btn landing-btn--ghost"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="landing-btn landing-btn--primary"
          onClick={onContinue}
        >
          I&apos;m bored — find something
        </button>
      </div>
    </section>
  );
}

function ResultsStep({
  matchResult,
  unlockUsed,
  unlockedSlug,
  onStartActivity,
  onPlanB,
  onBack,
}) {
  const scoredActivities = useMemo(
    () =>
      (matchResult?.results || []).map((entry) => {
        const activity = entry.activity;
        const isUnlocked =
          unlockUsed &&
          Boolean(unlockedSlug) &&
          activity?.slug === unlockedSlug;
        const isLockedOut = unlockUsed && !isUnlocked;
        return {
          activity: {
            ...activity,
            isLocked: !isUnlocked,
            demoLockedOut: isLockedOut,
          },
          score:
            typeof entry.score === "number"
              ? entry.score
              : entry.fitPercent ?? null,
          whyItFits: entry.whyItFits || activity?.whyItFits || null,
        };
      }),
    [matchResult, unlockUsed, unlockedSlug]
  );

  const activities = scoredActivities.map((entry) => entry.activity);

  function detailsStartLabel(activity) {
    if (!activity) return "Unlock free";
    if (!activity.isLocked) {
      return activity.activityStyle === "imaginative"
        ? "Enter the story"
        : "Start this activity";
    }
    if (activity.demoLockedOut) {
      return "Get Plus";
    }
    return "Create free account to unlock";
  }

  return (
    <section className="demo-step demo-step--results" aria-labelledby="demo-results-title">
      <p className="demo-screen-kicker">Matches</p>
      <h1 id="demo-results-title">Pick something to do</h1>
      <p className="demo-step-lead">
        Open <strong>Details</strong> for a preview — what it is and why it
        fits. Steps stay locked until you create a free account.
      </p>

      <p className="demo-unlock-status" role="status">
        {unlockUsed
          ? "✓ Free unlock used — create an account (or Plus) for more"
          : "Preview any activity · unlock full steps with a free account"}
      </p>

      <ActivityResults
        activities={activities}
        scoredActivities={scoredActivities}
        isLoading={false}
        currentMoment={matchResult?.moment || null}
        handleStartActivity={onStartActivity}
        hideFeedbackActions
        hideSaveFavorite
        detailsVariant="teaser"
        detailsStartLabel={detailsStartLabel}
        handleTryNextBest={onPlanB}
        panelTitle="Pick something to do"
        panelNote="Sample library matches for this moment and ages — Plus personalizes to your household."
      />

      <div className="demo-plus-callout">
        <p>
          FamilyFlow Plus goes further: activities around your kids, supplies,
          preferences, and exact situation.
        </p>
      </div>

      <div className="demo-step-actions">
        <button
          type="button"
          className="landing-btn landing-btn--ghost"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="landing-btn landing-btn--ghost"
          onClick={onPlanB}
        >
          Not feeling these? Try the next best matches
        </button>
      </div>
    </section>
  );
}

function ActivityStep({
  activity,
  currentMoment,
  completed,
  onFinished,
  onBackToResults,
}) {
  const [questMode] = useState("active");
  const [openSections, setOpenSections] = useState(() =>
    getDefaultOpenSections({
      mission: true,
      role: true,
      starters: true,
      materials: true,
      steps: true,
      rescue: true,
      finish: true,
    })
  );
  const [checkedStarters, setCheckedStarters] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);

  return (
    <section className="demo-step demo-step--activity" aria-label="Full activity">
      <div className="demo-activity-toolbar">
        <button
          type="button"
          className="landing-btn landing-btn--ghost"
          onClick={onBackToResults}
        >
          Back to matches
        </button>
        {questMode === "active" && !completed ? (
          <button
            type="button"
            className="landing-btn landing-btn--primary"
            onClick={onFinished}
          >
            Finish activity
          </button>
        ) : null}
      </div>

      <div className="panel active-activity-panel pretend-active-panel quest-v2-panel">
        <h1 className="simple-active-title">{activity.title}</h1>
        <QuestContent
          activity={activity}
          mode={questMode}
          currentMoment={currentMoment}
          openSections={openSections}
          onSectionOpenChange={(key, nextOpen) =>
            setOpenSections((current) => ({ ...current, [key]: nextOpen }))
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
      </div>

      {completed ? (
        <div className="demo-complete-cta">
          <h2>That&apos;s the FamilyFlow idea</h2>
          <p>
            Create a free account to keep your unlock, or get Plus for unlimited
            personalized activities.
          </p>
          <div className="demo-step-actions">
            <Link
              className="landing-btn landing-btn--primary"
              to={PLUS_SIGNUP_URL}
            >
              Get FamilyFlow Plus
            </Link>
            <button
              type="button"
              className="landing-btn landing-btn--ghost"
              onClick={onBackToResults}
            >
              Back to matches
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Public interactive marketing demo.
 *
 * Moment → ages → kid choices → app-style matches + full Details preview →
 * create account to unlock one free pretend activity.
 */
function DemoPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("moment");
  const [momentId, setMomentId] = useState(null);
  const [ages, setAges] = useState([8]);
  const [energy, setEnergy] = useState("neutral");
  const [activityStyle, setActivityStyle] = useState("imaginative");
  const [matchResult, setMatchResult] = useState(null);
  const [unlockUsed, setUnlockUsed] = useState(false);
  const [unlockedSlug, setUnlockedSlug] = useState(null);
  const [unlockedActivity, setUnlockedActivity] = useState(null);
  const [activityCompleted, setActivityCompleted] = useState(false);

  useEffect(() => {
    captureAttribution();
    const cache = readDemoUnlockCache();
    if (cache?.used) {
      setUnlockUsed(true);
      if (cache.activitySlug) {
        setUnlockedSlug(cache.activitySlug);
      }
    }
  }, []);

  const selectedMoment = useMemo(
    () => DEMO_MOMENT_LIST.find((moment) => moment.id === momentId) || null,
    [momentId]
  );

  function resetDemo() {
    setStage("moment");
    setMomentId(null);
    setAges([8]);
    setEnergy("neutral");
    setActivityStyle("imaginative");
    setMatchResult(null);
    setUnlockedActivity(null);
    setActivityCompleted(false);
  }

  function handleSelectMoment(id) {
    setMomentId(id);
    trackProductEvent("demo_page_moment_selected", { momentId: id });
    setStage("ages");
  }

  function runMatch(offset = 0) {
    const base = matchDemoActivities({
      momentId,
      childAges: ages,
      pool: DEMO_ACTIVITY_POOL,
      limit: 3,
      offset,
      activityStyle,
    });

    // Soft-rank by kid energy preference within the already Fit-scored batch.
    if (energy && Array.isArray(base.results)) {
      const preferred = [];
      const rest = [];
      for (const entry of base.results) {
        if (entry.activity?.energy === energy) preferred.push(entry);
        else rest.push(entry);
      }
      base.results = [...preferred, ...rest].map((entry, index) => ({
        ...entry,
        rank: (base.offset || 0) + index + 1,
      }));
    }

    setMatchResult(base);
    trackProductEvent("demo_activity_generated", {
      momentId,
      ages,
      style: activityStyle,
      energy,
      count: base.results.length,
      source: "demo_page",
    });
  }

  function handleFindActivities() {
    runMatch(0);
    setStage("results");
  }

  function handlePlanB() {
    if (!matchResult) return;
    const next = rotateDemoResults(matchResult, {
      childAges: ages,
      activityStyle,
      pool: DEMO_ACTIVITY_POOL,
    });
    setMatchResult(next);
    trackProductEvent("demo_page_plan_b_clicked", {
      momentId: next.momentId,
      offset: next.offset,
    });
  }

  function handleStartActivity(activity) {
    const isUnlocked =
      unlockUsed &&
      unlockedSlug &&
      activity?.slug === unlockedSlug;

    if (isUnlocked) {
      setUnlockedActivity(activity);
      setActivityCompleted(false);
      setStage("activity");
      trackProductEvent("demo_page_unlock_claimed", {
        slug: activity?.slug || "",
        style: activity?.activityStyle || "",
      });
      return;
    }

    if (unlockUsed || activity?.demoLockedOut) {
      trackProductEvent("demo_page_plus_cta_clicked", {
        slug: activity?.slug || "",
        source: "unlock_cta",
      });
      navigate(PLUS_SIGNUP_URL);
      return;
    }

    trackProductEvent("demo_page_signup_cta_clicked", {
      slug: activity?.slug || "",
      source: "unlock_free",
    });
    navigate(buildDemoUnlockSignupUrl(activity));
  }

  return (
    <div className="landing demo-page demo-product-walkthrough">
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
          <div className="demo-topbar-actions">
            <Link className="landing-topbar-link" to="/login">
              Log in
            </Link>
            <Link className="landing-btn landing-btn--primary" to="/signup">
              Create free account
            </Link>
          </div>
        </div>
      </header>

      <DemoBanner unlockUsed={unlockUsed} onReset={resetDemo} />

      <main className="demo-page-main demo-page-main--product">
        {stage === "moment" ? (
          <MomentStep momentId={momentId} onSelect={handleSelectMoment} />
        ) : null}

        {stage === "ages" ? (
          <AgesStep
            ages={ages}
            onChangeAge={(index, nextAge) => {
              setAges((current) =>
                current.map((age, i) => (i === index ? nextAge : age))
              );
            }}
            onAddChild={() => setAges((current) => [...current, 10].slice(0, 2))}
            onRemoveChild={(index) =>
              setAges((current) => current.filter((_, i) => i !== index))
            }
            onContinue={() => setStage("kid")}
          />
        ) : null}

        {stage === "kid" ? (
          <KidStep
            energy={energy}
            style={activityStyle}
            onEnergy={setEnergy}
            onStyle={setActivityStyle}
            onBack={() => setStage("ages")}
            onContinue={handleFindActivities}
          />
        ) : null}

        {stage === "results" && matchResult ? (
          <ResultsStep
            matchResult={matchResult}
            unlockUsed={unlockUsed}
            unlockedSlug={unlockedSlug}
            onStartActivity={handleStartActivity}
            onPlanB={handlePlanB}
            onBack={() => setStage("kid")}
          />
        ) : null}

        {stage === "activity" && unlockedActivity ? (
          <ActivityStep
            activity={unlockedActivity}
            currentMoment={
              matchResult?.moment || selectedMoment?.moment || null
            }
            completed={activityCompleted}
            onFinished={() => {
              setActivityCompleted(true);
              trackProductEvent("demo_page_activity_finished", {
                slug: unlockedActivity.slug || "",
              });
            }}
            onBackToResults={() => {
              setStage("results");
              setActivityCompleted(false);
            }}
          />
        ) : null}

        {momentId && stage !== "moment" ? (
          <p className="demo-moment-footnote">
            Current moment: {selectedMoment?.label}
            {ages.length ? ` · ages ${ages.join(" & ")}` : ""}
            {" · "}
            <button
              type="button"
              className="demo-text-button"
              onClick={() => setStage("moment")}
            >
              Change moment
            </button>
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default DemoPage;
