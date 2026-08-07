// src/pages/DemoPage.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QuestContent from "../components/quest/QuestContent";
import { getDefaultOpenSections } from "../components/quest/questSectionDefaults";
import { DEMO_ACTIVITY_POOL } from "../constants/demoActivityPool";
import {
  DEFAULT_DEMO_MOMENT_ID,
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

const TIME_OPTIONS = [10, 20, 30, 45];
const MESS_OPTIONS = [
  { id: "low", label: "Almost none" },
  { id: "medium", label: "A little mess OK" },
  { id: "high", label: "Mess is fine" },
];
const SPACE_OPTIONS = [
  { id: "inside", label: "Inside", space: "Living room" },
  { id: "outside", label: "Outside", space: "Backyard" },
];
const SUPERVISION_OPTIONS = [
  { id: "independent", label: "Independent" },
  { id: "mostly-independent", label: "Mostly independent" },
  { id: "nearby", label: "Together / nearby" },
];
const STYLE_OPTIONS = [
  { id: "simple", label: "Something simple" },
  { id: "imaginative", label: "Pretend / imaginative" },
];

const VALID_MESS = new Set(MESS_OPTIONS.map((o) => o.id));
const VALID_SUPERVISION = new Set(SUPERVISION_OPTIONS.map((o) => o.id));
const VALID_SPACE = new Set(SPACE_OPTIONS.map((o) => o.id));

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

function DemoBanner({ sawAha, onReset }) {
  return (
    <aside className="demo-sticky-banner" aria-label="Demo status">
      <div className="demo-sticky-banner-copy">
        <strong>You&apos;re trying FamilyFlow</strong>
        <p>
          {sawAha
            ? "Liked it? Create a free account so FamilyFlow can remember your kids and what works."
            : "Tell us the moment — get one full activity that fits. No account needed yet."}
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

function PersonalizeStep({
  momentId,
  onSelectMoment,
  ages,
  onChangeAge,
  onAddChild,
  onRemoveChild,
  timeMinutes,
  onTime,
  spaceMode,
  onSpace,
  messLevel,
  onMess,
  supervisionLevel,
  onSupervision,
  activityStyle,
  onStyle,
  onContinue,
}) {
  return (
    <section className="demo-step" aria-labelledby="demo-personalize-title">
      <p className="demo-screen-kicker">Your situation</p>
      <h1 id="demo-personalize-title">What fits right now?</h1>
      <p className="demo-step-lead">
        Age, time, place, mess, and how independent — then one good activity.
      </p>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Parent moment</p>
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
                onClick={() => onSelectMoment(moment.id)}
              >
                <strong>{moment.shortLabel || moment.label}</strong>
                <small>{moment.description}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Who&apos;s playing?</p>
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
      </div>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Time available</p>
        <div className="demo-chip-row" role="group" aria-label="Time">
          {TIME_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={
                timeMinutes === minutes
                  ? "demo-choice-chip is-selected"
                  : "demo-choice-chip"
              }
              aria-pressed={timeMinutes === minutes}
              onClick={() => onTime(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </div>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Inside or outside</p>
        <div className="demo-chip-row" role="group" aria-label="Space">
          {SPACE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                spaceMode === option.id
                  ? "demo-choice-chip is-selected"
                  : "demo-choice-chip"
              }
              aria-pressed={spaceMode === option.id}
              onClick={() => onSpace(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Mess tolerance</p>
        <div className="demo-chip-row" role="group" aria-label="Mess">
          {MESS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                messLevel === option.id
                  ? "demo-choice-chip is-selected"
                  : "demo-choice-chip"
              }
              aria-pressed={messLevel === option.id}
              onClick={() => onMess(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="demo-choice-block">
        <p className="demo-choice-label">Independent or family</p>
        <div className="demo-chip-row" role="group" aria-label="Supervision">
          {SUPERVISION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                supervisionLevel === option.id
                  ? "demo-choice-chip is-selected"
                  : "demo-choice-chip"
              }
              aria-pressed={supervisionLevel === option.id}
              onClick={() => onSupervision(option.id)}
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
                activityStyle === option.id
                  ? "demo-choice-chip is-selected"
                  : "demo-choice-chip"
              }
              aria-pressed={activityStyle === option.id}
              onClick={() => onStyle(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="landing-btn landing-btn--primary demo-step-continue"
        disabled={!momentId}
        onClick={onContinue}
      >
        Find something to do
      </button>
    </section>
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

function ActivityStep({
  activity,
  currentMoment,
  completed,
  showRememberGate,
  showSaveGate,
  onFinished,
  onPlanB,
  onBack,
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
          onClick={onBack}
        >
          Adjust situation
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

      <p className="demo-aha-kicker" role="status">
        Here&apos;s one that fits — full steps, no account required.
      </p>

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
        />
      </div>

      {!showSaveGate ? (
        <div className="demo-step-actions">
          <button
            type="button"
            className="landing-btn landing-btn--ghost"
            onClick={onPlanB}
          >
            Not feeling it? Try another
          </button>
        </div>
      ) : null}

      {showSaveGate ? <SoftGate activity={activity} variant="save" /> : null}
      {showRememberGate && !showSaveGate ? (
        <SoftGate activity={activity} variant="remember" />
      ) : null}
    </section>
  );
}

/**
 * Public interactive marketing demo.
 * Personalize → one full aha activity → soft signup gate → account for more.
 */
function DemoPage() {
  const [searchParams] = useSearchParams();
  const bootstrappedRef = useRef(false);

  const [stage, setStage] = useState("personalize");
  const [momentId, setMomentId] = useState(DEFAULT_DEMO_MOMENT_ID);
  const [ages, setAges] = useState([8]);
  const [timeMinutes, setTimeMinutes] = useState(20);
  const [spaceMode, setSpaceMode] = useState("inside");
  const [messLevel, setMessLevel] = useState("low");
  const [supervisionLevel, setSupervisionLevel] = useState("independent");
  const [activityStyle, setActivityStyle] = useState("imaginative");
  const [matchResult, setMatchResult] = useState(null);
  const [activeActivity, setActiveActivity] = useState(null);
  const [activityCompleted, setActivityCompleted] = useState(false);
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
    const timeParam = Number(searchParams.get("time"));
    const spaceParam = searchParams.get("space");
    const messParam = searchParams.get("mess");
    const supervisionParam = searchParams.get("supervision");
    const situationId = searchParams.get("situation");

    let seeded = false;

    if (momentParam && getDemoMoment(momentParam)) {
      setMomentId(momentParam);
      seeded = true;
      const base = getDemoMoment(momentParam).moment;
      if (base?.timeNeededMinutes) setTimeMinutes(base.timeNeededMinutes);
      if (base?.messLevel && VALID_MESS.has(base.messLevel)) {
        setMessLevel(base.messLevel);
      }
      if (base?.supervisionLevel && VALID_SUPERVISION.has(base.supervisionLevel)) {
        setSupervisionLevel(base.supervisionLevel);
      }
      if (String(base?.space || "").toLowerCase().includes("yard")) {
        setSpaceMode("outside");
      }
    }

    if (agesParam) {
      setAges(agesParam);
      seeded = true;
    }
    if (Number.isFinite(timeParam) && TIME_OPTIONS.includes(timeParam)) {
      setTimeMinutes(timeParam);
      seeded = true;
    }
    if (spaceParam && VALID_SPACE.has(spaceParam)) {
      setSpaceMode(spaceParam);
      seeded = true;
    }
    if (messParam && VALID_MESS.has(messParam)) {
      setMessLevel(messParam);
      seeded = true;
    }
    if (supervisionParam && VALID_SUPERVISION.has(supervisionParam)) {
      setSupervisionLevel(supervisionParam);
      seeded = true;
    }

    if (seeded || situationId) {
      trackProductEvent("demo_started", {
        source: "landing_situation",
        situationId: situationId || null,
        momentId: momentParam || null,
      });
    }
  }, [searchParams]);

  const momentOverrides = useMemo(() => {
    const spaceOption =
      SPACE_OPTIONS.find((option) => option.id === spaceMode) ||
      SPACE_OPTIONS[0];
    return {
      timeNeededMinutes: timeMinutes,
      space: spaceOption.space,
      messLevel,
      supervisionLevel,
    };
  }, [timeMinutes, spaceMode, messLevel, supervisionLevel]);

  const selectedMoment = useMemo(
    () => DEMO_MOMENT_LIST.find((moment) => moment.id === momentId) || null,
    [momentId]
  );

  function resetDemo() {
    setStage("personalize");
    setMomentId(DEFAULT_DEMO_MOMENT_ID);
    setAges([8]);
    setTimeMinutes(20);
    setSpaceMode("inside");
    setMessLevel("low");
    setSupervisionLevel("independent");
    setActivityStyle("imaginative");
    setMatchResult(null);
    setActiveActivity(null);
    setActivityCompleted(false);
    setSawAha(false);
    setFreeAhaUsed(false);
    setShowSaveGate(false);
  }

  function handleSelectMoment(id) {
    setMomentId(id);
    const base = getDemoMoment(id)?.moment;
    if (base) {
      if (base.timeNeededMinutes) setTimeMinutes(base.timeNeededMinutes);
      if (base.messLevel && VALID_MESS.has(base.messLevel)) {
        setMessLevel(base.messLevel);
      }
      if (base.supervisionLevel && VALID_SUPERVISION.has(base.supervisionLevel)) {
        setSupervisionLevel(base.supervisionLevel);
      }
      if (String(base.space || "").toLowerCase().includes("yard")) {
        setSpaceMode("outside");
      } else {
        setSpaceMode("inside");
      }
    }
    trackProductEvent("demo_page_moment_selected", { momentId: id });
  }

  function openActivityFromMatch(result) {
    const top = result?.results?.[0]?.activity || null;
    if (!top) return;
    setActiveActivity(top);
    setActivityCompleted(false);
    setSawAha(true);
    setFreeAhaUsed(true);
    setShowSaveGate(false);
    setStage("activity");
    trackProductEvent("demo_activity_generated", {
      momentId: result.momentId,
      ages: result.childAges,
      style: activityStyle,
      count: 1,
      source: "demo_page",
    });
    trackProductEvent("demo_page_activity_opened", {
      slug: top.slug || "",
      source: "aha",
    });
  }

  function handleFindActivities() {
    if (!momentId) return;
    const result = matchDemoActivities({
      momentId,
      childAges: ages,
      pool: DEMO_ACTIVITY_POOL,
      limit: 1,
      offset: 0,
      activityStyle,
      momentOverrides,
    });
    setMatchResult(result);
    openActivityFromMatch(result);
  }

  function handlePlanB() {
    if (!matchResult) return;

    if (freeAhaUsed) {
      setShowSaveGate(true);
      trackProductEvent("demo_page_signup_cta_clicked", {
        slug: activeActivity?.slug || "",
        source: "plan_b_gate",
      });
      return;
    }

    const next = rotateDemoResults(matchResult, {
      childAges: ages,
      activityStyle,
      pool: DEMO_ACTIVITY_POOL,
      momentOverrides,
      limit: 1,
    });
    setMatchResult(next);
    openActivityFromMatch(next);
    trackProductEvent("demo_page_plan_b_clicked", {
      momentId: next.momentId,
      offset: next.offset,
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
        {stage === "personalize" ? (
          <PersonalizeStep
            momentId={momentId}
            onSelectMoment={handleSelectMoment}
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
            timeMinutes={timeMinutes}
            onTime={setTimeMinutes}
            spaceMode={spaceMode}
            onSpace={setSpaceMode}
            messLevel={messLevel}
            onMess={setMessLevel}
            supervisionLevel={supervisionLevel}
            onSupervision={setSupervisionLevel}
            activityStyle={activityStyle}
            onStyle={setActivityStyle}
            onContinue={handleFindActivities}
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
            showSaveGate={showSaveGate}
            onFinished={() => {
              setActivityCompleted(true);
              trackProductEvent("demo_page_activity_finished", {
                slug: activeActivity.slug || "",
              });
            }}
            onPlanB={handlePlanB}
            onBack={() => {
              setStage("personalize");
              setShowSaveGate(false);
            }}
          />
        ) : null}

        {momentId && stage === "activity" ? (
          <p className="demo-moment-footnote">
            Current moment: {selectedMoment?.label}
            {ages.length ? ` · ages ${ages.join(" & ")}` : ""}
            {` · ${timeMinutes} min`}
            {" · "}
            <button
              type="button"
              className="demo-text-button"
              onClick={() => setStage("personalize")}
            >
              Change situation
            </button>
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default DemoPage;
