// src/pages/DemoPage.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ActivityResults from "../components/ActivityResults";
import QuestContent from "../components/quest/QuestContent";
import { getDefaultOpenSections } from "../components/quest/questSectionDefaults";
import { DEMO_ACTIVITY_POOL } from "../constants/demoActivityPool";
import {
  DEMO_MOMENT_LIST,
  getDemoMoment,
} from "../constants/demoMoments";
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
  { id: "quiet", label: "Quiet", hint: "Calm and settled" },
  { id: "neutral", label: "Just right", hint: "Ready for something" },
  { id: "energetic", label: "Bouncy", hint: "Need to move" },
];

const STYLE_OPTIONS = [
  { id: "simple", label: "Simple", hint: "Easy and clear" },
  { id: "imaginative", label: "Imaginative", hint: "Pretend / creative" },
];

function parseAgesParam(raw) {
  if (!raw) return null;
  const ages = String(raw)
    .split(",")
    .map((part) => Math.round(Number(part.trim())))
    .filter(
      (age) =>
        Number.isFinite(age) && age >= MIN_DEMO_AGE && age <= MAX_DEMO_AGE
    )
    .slice(0, 2);
  return ages.length > 0 ? ages : null;
}

function mapEnergyToActivityEnergy(energy) {
  if (energy === "quiet") return "low";
  if (energy === "energetic") return "high";
  return "neutral";
}

function DemoBanner({ sawAha, onReset }) {
  return (
    <aside className="demo-sticky-banner" aria-label="Demo status">
      <div className="demo-sticky-banner-copy">
        <strong>You&apos;re trying FamilyFlow</strong>
        <p>
          {sawAha
            ? "Liked it? Create a free account so FamilyFlow can remember your kids and what works."
            : "Same flow as the app — parent moment, kid vibe, pick something. No account needed yet."}
        </p>
      </div>
      <div className="demo-sticky-banner-actions">
        <Link className="landing-btn landing-btn--primary" to="/signup">
          Create free account
        </Link>
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

function SoftGate({ activity, variant = "remember" }) {
  function goSignup(source) {
    trackProductEvent("demo_page_signup_cta_clicked", {
      slug: activity?.slug || "",
      source,
    });
    window.location.assign(buildDemoUnlockSignupUrl(activity));
  }

  if (variant === "save") {
    return (
      <div className="demo-soft-gate" role="region" aria-label="Create account">
        <h2>Save activities across FamilyFlow</h2>
        <p>Create your free account to continue.</p>
        <div className="demo-step-actions">
          <button
            type="button"
            className="landing-btn landing-btn--primary"
            onClick={() => goSignup("soft_gate_save")}
          >
            Create account
          </button>
          <Link className="landing-btn landing-btn--ghost" to={PLUS_SIGNUP_URL}>
            Get Plus
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-soft-gate" role="region" aria-label="Create account">
      <h2>Want activities that remember your kids?</h2>
      <p>
        Preferences and what works for your family stay with your free account.
      </p>
      <div className="demo-step-actions">
        <button
          type="button"
          className="landing-btn landing-btn--primary"
          onClick={() => goSignup("soft_gate_remember")}
        >
          Create free account
        </button>
      </div>
    </div>
  );
}

function MomentStep({ momentId, onSelect }) {
  return (
    <section className="demo-step" aria-labelledby="demo-moment-title">
      <p className="demo-screen-kicker">Parent</p>
      <h1 id="demo-moment-title">What&apos;s happening right now?</h1>
      <p className="demo-step-lead">
        Pick a parent moment — the same presets you&apos;ll use in the app.
      </p>
      <div
        className="demo-moment-grid preset-grid preset-grid--dense"
        role="group"
        aria-label="Moments"
      >
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

function AgesStep({
  ages,
  onChangeAge,
  onAddChild,
  onRemoveChild,
  onContinue,
  onBack,
}) {
  return (
    <section className="demo-step" aria-labelledby="demo-ages-title">
      <p className="demo-screen-kicker">Who&apos;s playing</p>
      <h1 id="demo-ages-title">Ages only</h1>
      <p className="demo-step-lead">
        No names or profiles yet — up to two kids. The app will remember more
        after you create an account.
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
          Continue
        </button>
      </div>
    </section>
  );
}

function KidStep({
  energy,
  style,
  isMatching,
  onEnergy,
  onStyle,
  onContinue,
  onBack,
}) {
  return (
    <section className="demo-step demo-step--kid" aria-labelledby="demo-kid-title">
      <p className="demo-screen-kicker">Kid</p>
      <h1 id="demo-kid-title">What sounds good?</h1>
      <p className="demo-step-lead">
        Same kid screen as the app — energy and style, then I&apos;m Bored.
      </p>

      <div className="demo-choice-block">
        <p className="demo-choice-label">My energy</p>
        <div className="demo-chip-row" role="group" aria-label="Energy">
          {ENERGY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                energy === option.id
                  ? `demo-choice-chip is-selected demo-energy-chip--${option.id}`
                  : `demo-choice-chip demo-energy-chip--${option.id}`
              }
              aria-pressed={energy === option.id}
              onClick={() => onEnergy(option.id)}
              disabled={isMatching}
            >
              <span>{option.label}</span>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Style</p>
        <div className="demo-style-grid" role="group" aria-label="Style">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                style === option.id
                  ? "demo-style-button is-selected"
                  : "demo-style-button"
              }
              aria-pressed={style === option.id}
              onClick={() => onStyle(option.id)}
              disabled={isMatching}
            >
              <span>{option.label}</span>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="demo-step-actions demo-step-actions--kid">
        <button
          type="button"
          className="landing-btn landing-btn--ghost"
          onClick={onBack}
          disabled={isMatching}
        >
          Back
        </button>
        <button
          type="button"
          className="im-bored-button demo-im-bored"
          onClick={onContinue}
          disabled={isMatching}
        >
          {isMatching ? "Finding activities…" : "I'm Bored"}
        </button>
      </div>
    </section>
  );
}

function ResultsStep({
  matchResult,
  onStartActivity,
  onPlanB,
  onBack,
  showSaveGate,
  gateActivity,
}) {
  const scoredActivities = useMemo(
    () =>
      (matchResult?.results || []).map((entry) => ({
        activity: entry.activity,
        score:
          typeof entry.score === "number"
            ? entry.score
            : entry.fitPercent ?? null,
        whyItFits: entry.whyItFits || entry.activity?.whyItFits || null,
      })),
    [matchResult]
  );

  const activities = scoredActivities.map((entry) => entry.activity);

  if (showSaveGate) {
    return (
      <section className="demo-step" aria-labelledby="demo-results-title">
        <p className="demo-screen-kicker">Matches</p>
        <h1 id="demo-results-title">Want another activity?</h1>
        <SoftGate activity={gateActivity} variant="save" />
        <div className="demo-step-actions">
          <button
            type="button"
            className="landing-btn landing-btn--ghost"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="demo-step demo-step--results"
      aria-labelledby="demo-results-title"
    >
      <p className="demo-screen-kicker">Quest</p>
      <h1 id="demo-results-title">Pick something to do</h1>
      <p className="demo-step-lead">
        Same choice cards as the app. Open one and Start — full steps, no
        account required for the first activity.
      </p>

      <ActivityResults
        activities={activities}
        scoredActivities={scoredActivities}
        isLoading={false}
        currentMoment={matchResult?.moment || null}
        handleStartActivity={onStartActivity}
        hideFeedbackActions
        hideSaveFavorite
        handleTryNextBest={onPlanB}
        panelTitle="Pick something to do"
        panelNote="Sample library matches for this moment and ages — Plus personalizes to your household."
      />

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
  showRememberGate,
  onFinished,
  onBackToResults,
}) {
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
    <section className="demo-step demo-step--activity" aria-label="Active activity">
      <div className="demo-activity-toolbar">
        <button
          type="button"
          className="landing-btn landing-btn--ghost"
          onClick={onBackToResults}
        >
          Back to matches
        </button>
        {!completed ? (
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
          mode="active"
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

      {showRememberGate ? (
        <SoftGate activity={activity} variant="remember" />
      ) : null}
    </section>
  );
}

/**
 * Public product walkthrough — mirrors Parent → Kid → Results → Start
 * using the curated demo pool (no OpenAI).
 */
function DemoPage() {
  const [searchParams] = useSearchParams();
  const bootstrappedRef = useRef(false);

  const [stage, setStage] = useState("moment");
  const [momentId, setMomentId] = useState(null);
  const [ages, setAges] = useState([8]);
  const [energy, setEnergy] = useState("neutral");
  const [activityStyle, setActivityStyle] = useState("imaginative");
  const [matchResult, setMatchResult] = useState(null);
  const [activeActivity, setActiveActivity] = useState(null);
  const [activityCompleted, setActivityCompleted] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [sawAha, setSawAha] = useState(false);
  const [freeAhaUsed, setFreeAhaUsed] = useState(false);
  const [showSaveGate, setShowSaveGate] = useState(false);

  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const momentParam = searchParams.get("moment");
    const agesParam = parseAgesParam(searchParams.get("ages"));
    const situationId = searchParams.get("situation");

    let seeded = false;

    if (momentParam && getDemoMoment(momentParam)) {
      setMomentId(momentParam);
      seeded = true;
    }
    if (agesParam) {
      setAges(agesParam);
      seeded = true;
    }

    if (seeded || situationId) {
      trackProductEvent("demo_started", {
        source: "landing_situation",
        situationId: situationId || null,
        momentId: momentParam || null,
      });
      if (momentParam && getDemoMoment(momentParam)) {
        setStage("ages");
      }
    }
  }, [searchParams]);

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
    setActiveActivity(null);
    setActivityCompleted(false);
    setIsMatching(false);
    setSawAha(false);
    setFreeAhaUsed(false);
    setShowSaveGate(false);
  }

  function handleSelectMoment(id) {
    setMomentId(id);
    trackProductEvent("demo_page_moment_selected", { momentId: id });
    setStage("ages");
  }

  function softRankByEnergy(result) {
    const preferredEnergy = mapEnergyToActivityEnergy(energy);
    if (!preferredEnergy || !Array.isArray(result?.results)) return result;
    const preferred = [];
    const rest = [];
    for (const entry of result.results) {
      if (entry.activity?.energy === preferredEnergy) preferred.push(entry);
      else rest.push(entry);
    }
    return {
      ...result,
      results: [...preferred, ...rest].map((entry, index) => ({
        ...entry,
        rank: (result.offset || 0) + index + 1,
      })),
    };
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
    return softRankByEnergy(base);
  }

  function handleImBored() {
    if (!momentId) return;
    setIsMatching(true);
    window.setTimeout(() => {
      const result = runMatch(0);
      setMatchResult(result);
      setIsMatching(false);
      setStage("results");
      setShowSaveGate(false);
      trackProductEvent("demo_activity_generated", {
        momentId,
        ages,
        style: activityStyle,
        energy,
        count: result.results.length,
        source: "demo_page",
      });
      trackProductEvent("demo_page_results_viewed", {
        momentId,
        count: result.results.length,
      });
    }, 400);
  }

  function handlePlanB() {
    if (!matchResult) return;
    if (freeAhaUsed) {
      setShowSaveGate(true);
      trackProductEvent("demo_page_signup_cta_clicked", {
        slug: activeActivity?.slug || matchResult.results?.[0]?.activity?.slug || "",
        source: "plan_b_gate",
      });
      return;
    }
    const next = softRankByEnergy(
      rotateDemoResults(matchResult, {
        childAges: ages,
        activityStyle,
        pool: DEMO_ACTIVITY_POOL,
        limit: 3,
      })
    );
    setMatchResult(next);
    trackProductEvent("demo_page_plan_b_clicked", {
      momentId: next.momentId,
      offset: next.offset,
    });
  }

  function handleStartActivity(activity) {
    if (!activity) return;
    setActiveActivity(activity);
    setActivityCompleted(false);
    setSawAha(true);
    setFreeAhaUsed(true);
    setStage("activity");
    trackProductEvent("demo_page_activity_opened", {
      slug: activity.slug || "",
      source: "results_start",
    });
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

      <DemoBanner sawAha={sawAha} onReset={resetDemo} />

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
            onBack={() => setStage("moment")}
          />
        ) : null}

        {stage === "kid" ? (
          <KidStep
            energy={energy}
            style={activityStyle}
            isMatching={isMatching}
            onEnergy={setEnergy}
            onStyle={setActivityStyle}
            onBack={() => setStage("ages")}
            onContinue={handleImBored}
          />
        ) : null}

        {stage === "results" && matchResult ? (
          <ResultsStep
            matchResult={matchResult}
            onStartActivity={handleStartActivity}
            onPlanB={handlePlanB}
            onBack={() => setStage("kid")}
            showSaveGate={showSaveGate}
            gateActivity={
              activeActivity || matchResult.results?.[0]?.activity || null
            }
          />
        ) : null}

        {stage === "activity" && activeActivity ? (
          <ActivityStep
            activity={activeActivity}
            currentMoment={
              matchResult?.moment || selectedMoment?.moment || null
            }
            completed={activityCompleted}
            showRememberGate={activityCompleted || sawAha}
            onFinished={() => {
              setActivityCompleted(true);
              trackProductEvent("demo_page_activity_finished", {
                slug: activeActivity.slug || "",
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
