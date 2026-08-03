import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LANDING_ACTIVITY_PREVIEW } from "../constants/landingActivityPreview";
import { defaultParentStatusPresets } from "../constants/presets";
import { inventoryPresets } from "../constants/inventoryPresets";
import { trackProductEvent } from "../utils/analytics";
import {
  getActivityMissionText,
  getActivityRoleLabel,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";
import {
  ageYearsToAgeRange,
  birthDateFromAgeYears,
  calculateAge,
} from "../utils/childAge";

const AGE_RANGES = ["3-5", "6-9", "10-12", "13+"];
const SUPPLY_CHIPS = [
  "LEGO",
  "Duplo",
  "wooden blocks",
  "crayons",
  "markers",
  "paper",
  "Play-Doh",
  "stuffed animals",
  "cars/trucks",
  "dolls",
  "board games",
  "books",
  "cardboard boxes",
  "pillows",
  "blankets",
  "flashlights",
];

const ONBOARDING_STORAGE_KEY = "ff_onboarding_draft_v1";

function readDraft() {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return null;
    }
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

function ChildStep({ childrenDraft, setChildrenDraft, onNext, onSkip }) {
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("6-9");
  const [birthDate, setBirthDate] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [interests, setInterests] = useState("");

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

    if (birthDate) {
      const age = calculateAge(birthDate);
      if (Number.isFinite(age)) {
        resolvedAgeRange = ageYearsToAgeRange(age);
      }
    } else if (ageYears !== "") {
      const age = Math.floor(Number(ageYears));
      if (Number.isFinite(age) && age >= 0 && age <= 25) {
        resolvedBirthDate = birthDateFromAgeYears(age);
        resolvedAgeRange = ageYearsToAgeRange(age);
      }
    }

    setChildrenDraft((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: cleaned,
        ageRange: resolvedAgeRange,
        birthDate: resolvedBirthDate,
        interests: interests.trim(),
        needs: "",
        createdAt: new Date().toISOString(),
      },
    ]);
    setName("");
    setBirthDate("");
    setAgeYears("");
    setInterests("");
  }

  return (
    <section className="panel onboarding-step">
      <p className="quest-v2-kicker">Step 1</p>
      <h1>Who’s playing?</h1>
      <p>Add at least one kid. You can add another after the first.</p>

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
            </li>
          ))}
        </ul>
      ) : null}

      <div className="onboarding-actions">
        <button
          type="button"
          onClick={onNext}
          disabled={childrenDraft.length === 0}
        >
          Next: supplies
        </button>
        <button type="button" className="ghost-button" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </section>
  );
}

function SuppliesStep({ selectedSupplies, setSelectedSupplies, onNext, onBack, onSkip }) {
  function toggleSupply(name) {
    setSelectedSupplies((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  }

  return (
    <section className="panel onboarding-step">
      <p className="quest-v2-kicker">Step 2</p>
      <h1>What do you already have?</h1>
      <p>Tap the supplies nearby. This makes “why this fits” honest.</p>
      <div className="onboarding-supply-chips">
        {SUPPLY_CHIPS.map((name) => (
          <button
            key={name}
            type="button"
            className={
              selectedSupplies.includes(name)
                ? "onboarding-chip is-selected"
                : "onboarding-chip"
            }
            onClick={() => toggleSupply(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="onboarding-actions">
        <button type="button" className="secondary-action" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onNext}>
          Next: need right now
        </button>
        <button type="button" className="ghost-button" onClick={onSkip}>
          Skip
        </button>
      </div>
    </section>
  );
}

function MomentStep({ momentDraft, setMomentDraft, onNext, onBack, onSkip }) {
  return (
    <section className="panel onboarding-step">
      <p className="quest-v2-kicker">Step 3</p>
      <h1>Need right now?</h1>
      <p>Pick the parent moment. We’ll match time, mess, and noise.</p>
      <div className="onboarding-supply-chips">
        {defaultParentStatusPresets.slice(0, 6).map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={
              momentDraft.parentActivity === preset.activity
                ? "onboarding-chip is-selected"
                : "onboarding-chip"
            }
            onClick={() =>
              setMomentDraft({
                parentActivity: preset.activity,
                availability: preset.availability,
                timeNeededMinutes: preset.timeNeededMinutes,
                space: preset.space,
                messLevel: preset.messLevel,
                noiseLevel: preset.noiseLevel,
                supervisionLevel: preset.supervisionLevel,
              })
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="onboarding-form-grid">
        <label>
          Minutes
          <select
            value={momentDraft.timeNeededMinutes}
            onChange={(event) =>
              setMomentDraft((current) => ({
                ...current,
                timeNeededMinutes: Number(event.target.value),
              }))
            }
          >
            {[10, 15, 20, 30, 45].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mess
          <select
            value={momentDraft.messLevel}
            onChange={(event) =>
              setMomentDraft((current) => ({
                ...current,
                messLevel: event.target.value,
              }))
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Noise
          <select
            value={momentDraft.noiseLevel}
            onChange={(event) =>
              setMomentDraft((current) => ({
                ...current,
                noiseLevel: event.target.value,
              }))
            }
          >
            <option value="quiet">Quiet</option>
            <option value="normal">Normal</option>
            <option value="loud">Loud OK</option>
          </select>
        </label>
      </div>
      <div className="onboarding-actions">
        <button type="button" className="secondary-action" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onNext}>
          See first activity
        </button>
        <button type="button" className="ghost-button" onClick={onSkip}>
          Skip
        </button>
      </div>
    </section>
  );
}

function FirstActivityStep({ onStart, onBack }) {
  const activity = LANDING_ACTIVITY_PREVIEW;
  const theme = getVisualThemeMeta(activity.visualTheme);
  const role = getActivityRoleLabel(activity);
  const mission = getActivityMissionText(activity);

  return (
    <section className="panel onboarding-step">
      <p className="quest-v2-kicker">Your first activity</p>
      <h1>{activity.title}</h1>
      <div
        className={`onboarding-activity-preview activity-card--theme-${theme.key}`}
        style={{ "--activity-theme-accent": theme.accent }}
      >
        <p className="quest-v2-kicker">
          {theme.icon} {theme.label}
        </p>
        <p>{mission}</p>
        <p>
          <strong>You are {role}</strong>
        </p>
      </div>
      <div className="onboarding-actions">
        <button type="button" className="secondary-action" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onStart}>
          Enter the story
        </button>
        <Link className="ghost-button" to="/quest">
          Browse more later
        </Link>
      </div>
    </section>
  );
}

function OnboardingPage({ applyOnboardingDraft, handleStartActivity }) {
  const navigate = useNavigate();
  const saved = useMemo(() => readDraft(), []);
  const [step, setStep] = useState(saved?.step || "children");
  const [childrenDraft, setChildrenDraft] = useState(saved?.children || []);
  const [selectedSupplies, setSelectedSupplies] = useState(
    saved?.supplies || []
  );
  const [momentDraft, setMomentDraft] = useState(
    saved?.moment || {
      parentActivity: "On a work call",
      availability: "do-not-interrupt",
      timeNeededMinutes: 20,
      space: "Living room",
      messLevel: "low",
      noiseLevel: "quiet",
      supervisionLevel: "independent",
    }
  );

  function persist(next) {
    writeDraft(next);
  }

  function go(nextStep) {
    const draft = {
      step: nextStep,
      children: childrenDraft,
      supplies: selectedSupplies,
      moment: momentDraft,
    };
    persist(draft);
    setStep(nextStep);
    trackProductEvent("onboarding_step_completed", { step: nextStep });
  }

  function buildInventory() {
    const presetByName = new Map(
      inventoryPresets.map((item) => [item.name.toLowerCase(), item])
    );
    return selectedSupplies.map((name) => {
      const preset = presetByName.get(name.toLowerCase());
      return {
        id: crypto.randomUUID(),
        name,
        category: preset?.category || "Other",
      };
    });
  }

  function finish(skipped = false) {
    const inventory = buildInventory();
    applyOnboardingDraft?.({
      children: childrenDraft,
      inventory,
      moment: momentDraft,
      skipped,
    });
    trackProductEvent(skipped ? "onboarding_skipped" : "onboarding_completed", {
      childCount: childrenDraft.length,
      supplyCount: selectedSupplies.length,
    });
    try {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function handleSkip() {
    finish(true);
    navigate("/app");
  }

  function handleStart() {
    finish(false);
    handleStartActivity?.(LANDING_ACTIVITY_PREVIEW);
    navigate("/quest");
  }

  return (
    <section className="page-layout onboarding-page">
      <section className="page-intro">
        <h1>FamilyFlow setup</h1>
        <p>Reward is a real first activity—not a “setup complete” screen.</p>
      </section>

      {step === "children" ? (
        <ChildStep
          childrenDraft={childrenDraft}
          setChildrenDraft={setChildrenDraft}
          onNext={() => go("supplies")}
          onSkip={handleSkip}
        />
      ) : null}
      {step === "supplies" ? (
        <SuppliesStep
          selectedSupplies={selectedSupplies}
          setSelectedSupplies={setSelectedSupplies}
          onNext={() => go("moment")}
          onBack={() => go("children")}
          onSkip={handleSkip}
        />
      ) : null}
      {step === "moment" ? (
        <MomentStep
          momentDraft={momentDraft}
          setMomentDraft={setMomentDraft}
          onNext={() => go("activity")}
          onBack={() => go("supplies")}
          onSkip={handleSkip}
        />
      ) : null}
      {step === "activity" ? (
        <FirstActivityStep
          onStart={handleStart}
          onBack={() => go("moment")}
        />
      ) : null}
    </section>
  );
}

export default OnboardingPage;
