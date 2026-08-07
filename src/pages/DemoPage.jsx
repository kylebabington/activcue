// src/pages/DemoPage.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { claimDemoFreeUnlock, readDemoUnlockCache } from "../api/demoApi";
import { ApiRequestError } from "../api/apiClient";
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
import { buildSignupUrl } from "../utils/signupUrls";
import {
  getActivityMissionText,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";
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

function activityKey(activity) {
  return activity?.slug || activity?.id || activity?.title || "activity";
}

function DemoBanner({ unlockUsed, onReset }) {
  return (
    <aside className="demo-sticky-banner" aria-label="Demo status">
      <div className="demo-sticky-banner-copy">
        <strong>You&apos;re trying FamilyFlow</strong>
        <p>
          Demo activities come from a sample library.{" "}
          {unlockUsed
            ? "Free full-activity unlock used."
            : "Free full-activity unlock: 1 remaining."}
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
        Pick a moment. Recommendations change with your constraints.
      </p>
      <div className="demo-moment-grid" role="group" aria-label="Moments">
        {DEMO_MOMENT_LIST.map((moment) => {
          const selected = momentId === moment.id;
          return (
            <button
              key={moment.id}
              type="button"
              className={
                selected ? "demo-moment-card is-selected" : "demo-moment-card"
              }
              aria-pressed={selected}
              onClick={() => onSelect(moment.id)}
            >
              <strong>{moment.shortLabel || moment.label}</strong>
              <span>{moment.description}</span>
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
        <p className="demo-choice-label">What sounds good?</p>
        <div className="demo-chip-row" role="group" aria-label="Activity style">
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
  pendingUnlock,
  unlockError,
  isClaiming,
  onRequestUnlock,
  onConfirmUnlock,
  onCancelUnlock,
  onPlanB,
  onOpenUnlocked,
  onBack,
}) {
  return (
    <section className="demo-step" aria-labelledby="demo-results-title">
      <p className="demo-screen-kicker">Matches</p>
      <h1 id="demo-results-title">Choose your free activity</h1>
      <p className="demo-step-lead">
        We matched these from FamilyFlow&apos;s sample library based on the ages
        and moment you selected. You can unlock the full details of{" "}
        <strong>one</strong> activity for free. FamilyFlow Plus unlocks
        unlimited full activities personalized to your family.
      </p>

      <p className="demo-unlock-status" role="status">
        {unlockUsed
          ? "✓ Free activity unlocked"
          : "1 free unlock available"}
      </p>

      <ul className="demo-result-list">
        {matchResult.results.map((entry) => {
          const activity = entry.activity;
          const key = activityKey(activity);
          const theme = getVisualThemeMeta(activity.visualTheme);
          const isUnlocked = unlockUsed && unlockedSlug === activity.slug;
          const isLockedOut = unlockUsed && !isUnlocked;
          const mission = getActivityMissionText(activity);

          return (
            <li key={key}>
              <article
                className={`demo-result-card activity-card--theme-${theme.key}`}
                style={{ "--activity-theme-accent": theme.accent }}
              >
                <span className="demo-result-fit">{entry.fitPercent}% match</span>
                <h2>{activity.title}</h2>
                <p className="demo-result-summary">
                  {activity.summary || mission}
                </p>
                <p className="demo-result-why">{entry.whyItFits}</p>
                <ul className="demo-fit-chips">
                  {entry.whyFitChips.map((chip) => (
                    <li key={chip}>{chip}</li>
                  ))}
                </ul>
                <p className="demo-result-style">
                  {activity.activityStyle === "imaginative"
                    ? "Imaginative"
                    : "Simple"}
                </p>

                {isUnlocked ? (
                  <button
                    type="button"
                    className="landing-btn landing-btn--primary"
                    onClick={() => onOpenUnlocked(activity)}
                  >
                    Open full activity
                  </button>
                ) : isLockedOut ? (
                  <div className="demo-result-locked">
                    <p>Full details require FamilyFlow Plus</p>
                    <Link
                      className="landing-btn landing-btn--primary"
                      to={PLUS_SIGNUP_URL}
                    >
                      Get Plus
                    </Link>
                  </div>
                ) : (
                  <div className="demo-result-actions">
                    <button
                      type="button"
                      className="landing-btn landing-btn--primary"
                      onClick={() => onRequestUnlock(activity)}
                    >
                      Unlock full activity
                    </button>
                    <span className="demo-result-hint">1 free unlock available</span>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      <div className="demo-plus-callout">
        <p>
          FamilyFlow Plus goes further: it can create activities around your
          actual kids, available supplies, family preferences, and exact
          situation.
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

      {pendingUnlock ? (
        <div className="demo-unlock-modal" role="dialog" aria-modal="true">
          <div className="demo-unlock-modal-panel">
            <h2>Unlock this activity?</h2>
            <p>
              Your demo includes one full activity unlock. Once you unlock{" "}
              <strong>{pendingUnlock.title}</strong>, the other recommendations
              will remain previews.
            </p>
            <p>
              Want unlimited full activities? FamilyFlow Plus creates and unlocks
              activities matched to your exact family, supplies, and situation.
            </p>
            {unlockError ? (
              <p className="demo-unlock-error" role="alert">
                {unlockError}
              </p>
            ) : null}
            <div className="demo-step-actions">
              <button
                type="button"
                className="landing-btn landing-btn--ghost"
                onClick={onCancelUnlock}
                disabled={isClaiming}
              >
                Keep looking
              </button>
              <button
                type="button"
                className="landing-btn landing-btn--primary"
                onClick={onConfirmUnlock}
                disabled={isClaiming}
              >
                {isClaiming ? "Unlocking…" : "Unlock this activity"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
            The demo matched this activity from a sample library using the ages
            and moment you selected. FamilyFlow Plus can create personalized
            activities around your actual situation instead of being limited to
            the demo library.
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
              Try another demo
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
 * Moment → ages → kid choices → sample-library matches → one free full unlock
 * → complete Activity V2. No OpenAI. Auth only when claiming the unlock.
 */
function DemoPage() {
  const [stage, setStage] = useState("moment");
  const [momentId, setMomentId] = useState(null);
  const [ages, setAges] = useState([8]);
  const [energy, setEnergy] = useState("neutral");
  const [activityStyle, setActivityStyle] = useState("imaginative");
  const [matchResult, setMatchResult] = useState(null);
  const [unlockUsed, setUnlockUsed] = useState(false);
  const [unlockedSlug, setUnlockedSlug] = useState(null);
  const [unlockedActivity, setUnlockedActivity] = useState(null);
  const [pendingUnlock, setPendingUnlock] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [unlockError, setUnlockError] = useState("");
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
    setPendingUnlock(null);
    setUnlockError("");
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

  async function handleConfirmUnlock() {
    if (!pendingUnlock) return;
    setIsClaiming(true);
    setUnlockError("");

    try {
      await claimDemoFreeUnlock(pendingUnlock.slug || pendingUnlock.title);
      setUnlockUsed(true);
      setUnlockedSlug(pendingUnlock.slug || null);
      setUnlockedActivity(pendingUnlock);
      setPendingUnlock(null);
      setActivityCompleted(false);
      setStage("activity");
      trackProductEvent("demo_page_unlock_claimed", {
        slug: pendingUnlock.slug || "",
        style: pendingUnlock.activityStyle || "",
      });
    } catch (error) {
      const code = error instanceof ApiRequestError ? error.code : "";
      if (code === "FREE_IMAGINATIVE_UNLOCK_USED") {
        setUnlockUsed(true);
        setUnlockError(
          "You've already used your free full-activity unlock. Get Plus for unlimited full activities."
        );
      } else {
        setUnlockError(
          error instanceof Error
            ? error.message
            : "Could not unlock this activity. Try again."
        );
      }
    } finally {
      setIsClaiming(false);
    }
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
            pendingUnlock={pendingUnlock}
            unlockError={unlockError}
            isClaiming={isClaiming}
            onRequestUnlock={(activity) => {
              setUnlockError("");
              setPendingUnlock(activity);
            }}
            onConfirmUnlock={handleConfirmUnlock}
            onCancelUnlock={() => {
              setPendingUnlock(null);
              setUnlockError("");
            }}
            onPlanB={handlePlanB}
            onOpenUnlocked={(activity) => {
              setUnlockedActivity(activity);
              setActivityCompleted(false);
              setStage("activity");
            }}
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
