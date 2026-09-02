// src/pages/OnboardingPage.jsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "../config/brand.js";
import { DEMO_ACTIVITY_POOL } from "../constants/demoActivityPool";
import {
  CHILD_INDEPENDENCE_LEVELS,
  normalizeChildIndependenceLevel,
} from "../constants/activityPreferences";
import { matchDemoActivities } from "../features/demo";
import { storyifyCachedImaginativeActivity } from "../features/demo/storyifyCachedImaginativeActivity";
import { trackProductEvent } from "../utils/analytics";
import {
  ageYearsToAgeRange,
  birthDateFromAgeYears,
  calculateAge,
} from "../utils/childAge";
import {
  clearDemoActivityHandoff,
  readDemoActivityHandoff,
} from "../utils/signupUrls";

const AGE_RANGES = ["3-5", "6-9", "10-12", "13+"];
const ONBOARDING_STORAGE_KEY = "ff_onboarding_draft_v1";

const INDEPENDENCE_OPTIONS = [
  { id: "needs-help", label: "Needs help getting started" },
  { id: "usually-independent", label: "Usually starts independently" },
  { id: "very-independent", label: "Very independent" },
];

function readDraft() {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeDraft(draft) {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

function findPoolActivityBySlug(slug) {
  if (!slug) return null;
  const found = DEMO_ACTIVITY_POOL.find(
    (activity) => activity?.slug === slug
  );
  return found ? storyifyCachedImaginativeActivity(found) : null;
}

function pickFirstActivityForChild(child) {
  const age =
    child?.birthDate != null
      ? calculateAge(child.birthDate)
      : Number(child?.ageYears);
  const ages = [
    Number.isFinite(age) && age >= 0 ? Math.round(age) : 8,
  ];

  const match = matchDemoActivities({
    momentId: "cooking",
    childAges: ages,
    pool: DEMO_ACTIVITY_POOL,
    limit: 1,
  });
  return match?.results?.[0]?.activity || DEMO_ACTIVITY_POOL[0] || null;
}

function WelcomeStep({ onContinue }) {
  return (
    <section className="panel onboarding-step" aria-labelledby="welcome-title">
      <p className="quest-v2-kicker">Welcome</p>
      <h1 id="welcome-title">Welcome to {BRAND.name}</h1>
      <p>
        Let&apos;s make activities actually fit your family — starting with
        who&apos;s playing.
      </p>
      <div className="onboarding-actions">
        <button type="button" onClick={onContinue}>
          Add first child
        </button>
      </div>
    </section>
  );
}

function ChildStep({
  childrenDraft,
  setChildrenDraft,
  onFinish,
  onSkip,
  isPersisting = false,
}) {
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("6-9");
  const [birthDate, setBirthDate] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [interests, setInterests] = useState("");
  const [independenceLevel, setIndependenceLevel] = useState(
    "usually-independent"
  );

  const previewAge = (() => {
    if (birthDate) {
      const age = calculateAge(birthDate);
      return Number.isFinite(age) ? age : null;
    }
    const n = Math.floor(Number(ageYears));
    return Number.isFinite(n) && n >= 0 && n <= 25 ? n : null;
  })();

  function addChild() {
    const cleaned = name.trim();
    if (!cleaned) {
      return;
    }

    let resolvedBirthDate = birthDate || null;
    let resolvedAgeRange = ageRange;
    let resolvedAgeYears = null;

    if (birthDate) {
      const age = calculateAge(birthDate);
      if (Number.isFinite(age)) {
        resolvedAgeRange = ageYearsToAgeRange(age);
        resolvedAgeYears = age;
      }
    } else if (ageYears !== "") {
      const age = Math.floor(Number(ageYears));
      if (Number.isFinite(age) && age >= 0 && age <= 25) {
        resolvedBirthDate = birthDateFromAgeYears(age);
        resolvedAgeRange = ageYearsToAgeRange(age);
        resolvedAgeYears = age;
      }
    }

    setChildrenDraft((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: cleaned,
        ageRange: resolvedAgeRange,
        birthDate: resolvedBirthDate,
        ageYears: resolvedAgeYears,
        interests: interests.trim(),
        needs: "",
        independenceLevel: normalizeChildIndependenceLevel(independenceLevel),
        createdAt: new Date().toISOString(),
      },
    ]);
    setName("");
    setBirthDate("");
    setAgeYears("");
    setInterests("");
    setIndependenceLevel("usually-independent");
  }

  return (
    <section className="panel onboarding-step">
      <p className="quest-v2-kicker">Step 1</p>
      <h1>Who&apos;s playing?</h1>
      <p>Add at least one kid. Age, interests, and independence shape the match.</p>

      <div className="onboarding-form-grid">
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sam"
          />
        </label>
        <label>
          Birthday
          <input
            type="date"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => {
              setBirthDate(event.target.value);
              if (event.target.value) {
                const age = calculateAge(event.target.value);
                if (Number.isFinite(age)) {
                  setAgeYears(String(age));
                }
              }
            }}
          />
        </label>
        <label>
          Or exact age
          <input
            type="number"
            min={0}
            max={25}
            value={ageYears}
            onChange={(event) => {
              setAgeYears(event.target.value);
              if (event.target.value) {
                setBirthDate("");
              }
            }}
            placeholder="12"
          />
        </label>
        {previewAge != null ? (
          <p className="child-age-preview" role="status">
            Current age: {previewAge}
          </p>
        ) : (
          <label>
            Age range
            <select
              value={ageRange}
              onChange={(event) => setAgeRange(event.target.value)}
            >
              {AGE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Interests
          <input
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            placeholder="space, animals, building"
          />
        </label>
        <label>
          Independent play
          <select
            value={independenceLevel}
            onChange={(event) => setIndependenceLevel(event.target.value)}
          >
            {INDEPENDENCE_OPTIONS.filter((option) =>
              CHILD_INDEPENDENCE_LEVELS.includes(option.id)
            ).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="onboarding-actions">
        <button type="button" className="secondary-action" onClick={addChild}>
          Add kid
        </button>
      </div>

      {childrenDraft.length > 0 ? (
        <ul className="onboarding-chip-list">
          {childrenDraft.map((child) => (
            <li key={child.id}>
              {child.name} ·{" "}
              {child.birthDate
                ? `age ${calculateAge(child.birthDate)}`
                : child.ageRange}
              {child.interests ? ` · ${child.interests}` : ""}
              {child.independenceLevel
                ? ` · ${
                    INDEPENDENCE_OPTIONS.find(
                      (option) => option.id === child.independenceLevel
                    )?.label || child.independenceLevel
                  }`
                : ""}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="onboarding-actions">
        <button
          type="button"
          onClick={onFinish}
          disabled={childrenDraft.length === 0 || isPersisting}
        >
          {isPersisting ? "Saving…" : "Find something to do"}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={onSkip}
          disabled={isPersisting}
        >
          Skip for now
        </button>
      </div>
    </section>
  );
}

function OnboardingPage({
  applyOnboardingDraft,
  completeOnboardingAndPersist,
  handleStartActivity,
}) {
  const navigate = useNavigate();
  const saved = useMemo(() => readDraft(), []);
  const [step, setStep] = useState(saved?.step || "welcome");
  const [childrenDraft, setChildrenDraft] = useState(saved?.children || []);
  const [persistError, setPersistError] = useState("");
  const [isPersisting, setIsPersisting] = useState(false);

  function persist(next) {
    writeDraft(next);
  }

  function go(nextStep) {
    const draft = {
      step: nextStep,
      children: childrenDraft,
    };
    persist(draft);
    setStep(nextStep);
    trackProductEvent("onboarding_step_completed", { step: nextStep });
  }

  function clearLocalDraft() {
    try {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function resolveActivityToStart(children) {
    const handoff = readDemoActivityHandoff();
    if (handoff?.slug) {
      const preserved = findPoolActivityBySlug(handoff.slug);
      clearDemoActivityHandoff();
      if (preserved) return preserved;
    }
    return pickFirstActivityForChild(children[0]);
  }

  async function persistOnboarding(skipped = false) {
    const persistFn =
      typeof completeOnboardingAndPersist === "function"
        ? completeOnboardingAndPersist
        : null;

    if (!persistFn) {
      applyOnboardingDraft?.({
        children: childrenDraft,
        inventory: [],
        moment: null,
        skipped,
      });
      return;
    }

    await persistFn({
      children: childrenDraft,
      inventory: [],
      moment: null,
      skipped,
    });
  }

  async function handleSkip() {
    if (isPersisting) {
      return;
    }

    setPersistError("");
    setIsPersisting(true);
    try {
      await persistOnboarding(true);
      trackProductEvent("onboarding_skipped", {
        childCount: childrenDraft.length,
        supplyCount: 0,
      });
      clearLocalDraft();
      clearDemoActivityHandoff();
      navigate("/app");
    } catch (error) {
      console.error("Could not save onboarding:", error);
      setPersistError(
        error instanceof Error
          ? error.message
          : "Could not save onboarding. Your draft is still here — try again."
      );
    } finally {
      setIsPersisting(false);
    }
  }

  async function handleFinish() {
    if (childrenDraft.length === 0 || isPersisting) {
      return;
    }

    setPersistError("");
    setIsPersisting(true);
    try {
      await persistOnboarding(false);
      trackProductEvent("onboarding_completed", {
        childCount: childrenDraft.length,
        supplyCount: 0,
      });
      clearLocalDraft();

      const activity = resolveActivityToStart(childrenDraft);
      if (activity && typeof handleStartActivity === "function") {
        handleStartActivity(activity);
        trackProductEvent("activity_started", {
          source: "onboarding",
          slug: activity.slug || "",
        });
        navigate("/quest");
        return;
      }
      navigate("/app");
    } catch (error) {
      console.error("Could not save onboarding:", error);
      setPersistError(
        error instanceof Error
          ? error.message
          : "Could not save onboarding. Your draft is still here — try again."
      );
    } finally {
      setIsPersisting(false);
    }
  }

  return (
    <section className="page-layout onboarding-page">
      <section className="page-intro">
        <h1>{BRAND.name}</h1>
        <p>A quick setup so the next activity actually fits.</p>
      </section>

      {persistError ? (
        <p className="error-text" role="alert">
          {persistError}
        </p>
      ) : null}

      {step === "welcome" ? (
        <WelcomeStep onContinue={() => go("children")} />
      ) : null}
      {step === "children" ? (
        <ChildStep
          childrenDraft={childrenDraft}
          setChildrenDraft={setChildrenDraft}
          onFinish={handleFinish}
          onSkip={handleSkip}
          isPersisting={isPersisting}
        />
      ) : null}
    </section>
  );
}

export default OnboardingPage;
