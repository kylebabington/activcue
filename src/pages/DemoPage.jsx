// src/pages/DemoPage.jsx

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ActivityResults from "../components/ActivityResults";
import KidPage from "./KidPage";
import MomentStatusBanner from "../components/MomentStatusBanner";
import QuestContent from "../components/quest/QuestContent";
import { getDefaultOpenSections } from "../components/quest/questSectionDefaults";
import { DEMO_ACTIVITY_POOL } from "../constants/demoActivityPool";
import { DEMO_CHILDREN } from "../constants/demoChildren";
import { getDemoMoment } from "../constants/demoMoments";
import { defaultParentStatusPresets } from "../constants/presets";
import { matchDemoActivities } from "../features/demo";
import { formatAvailabilityLabel } from "../utils/activityFormatters";
import "../App.css";
import "../styles/landing.css";
import "../styles/demo.css";

const DEMO_MOMENT_ID = "dinner";
const DEMO_CHILD_ID = "maya";

// The marketing demo is intentionally focused on FamilyFlow's core experience:
// imaginative, contextual activities. Simple mode remains available in the product,
// but it is not part of this walkthrough.
const IMAGINATIVE_DEMO_POOL = DEMO_ACTIVITY_POOL.filter(
  (activity) => activity.activityStyle === "imaginative"
);

const DEMO_CHILD_PROFILES = [DEMO_CHILDREN.maya, DEMO_CHILDREN.leo];

function ParentDemoScreen({ onContinue }) {
  return (
    <section
      className="page-layout page-layout--parent parent-preset-page demo-product-screen"
      aria-label="Parent demo screen"
    >
      <section className="page-intro page-intro--minimal">
        <p className="demo-screen-kicker">Parent</p>
        <h1>Pick what’s happening</h1>
        <p>Choose a moment so kids get activities that fit.</p>
      </section>

      <section className="panel parent-preset-panel">
        <div className="preset-grid preset-grid--dense">
          {defaultParentStatusPresets.map((preset) => {
            const isCooking = preset.label === "Cooking";
            return (
              <button
                key={preset.label}
                type="button"
                className={isCooking ? "preset-card active" : "preset-card"}
                aria-pressed={isCooking}
                tabIndex={isCooking ? 0 : -1}
              >
                <span>{preset.label}</span>
                <small>
                  {formatAvailabilityLabel(preset.availability)} ·{" "}
                  {preset.timeNeededMinutes} min · {preset.space}
                </small>
              </button>
            );
          })}
        </div>

        <div className="demo-selected-moment" role="status">
          <strong>Current moment: Cooking dinner</strong>
          <span>20 min · Kitchen table · low mess · nearby supervision</span>
        </div>

        <button
          type="button"
          className="generate-button demo-next-screen"
          onClick={onContinue}
        >
          Go to Kid
        </button>
      </section>
    </section>
  );
}

function ResultsDemoScreen({
  matchResult,
  onStartActivity,
  activeChildProfile,
}) {
  const activities = matchResult.results.map((entry) => entry.activity);
  const scoredActivities = matchResult.results.map((entry) => ({
    activity: entry.activity,
    score: entry.score,
  }));

  const noop = () => {};

  return (
    <section
      className="page-layout page-layout--kid demo-product-screen"
      aria-label="Activity suggestions demo screen"
    >
      <section className="page-intro page-intro--kid page-intro--minimal">
        <p className="demo-screen-kicker">Activities</p>
        <h1>What should happen next?</h1>
      </section>

      <div className="kid-center-column">
        <MomentStatusBanner currentMoment={matchResult.moment} kidFacing />
      </div>

      <div className="activity-board-column">
        <ActivityResults
          activities={activities}
          scoredActivities={scoredActivities}
          isLoading={false}
          currentMoment={matchResult.moment}
          handleStartActivity={onStartActivity}
          saveFavoriteActivity={noop}
          handleTooMessy={noop}
          handleTooHard={noop}
          handleTooYoung={noop}
          handleTooOld={noop}
          handleTooEasy={noop}
          handleNeedQuieter={noop}
          handleMoreLikeThis={noop}
          handleTryNextBest={null}
          activitySessions={[]}
          activeChildName={activeChildProfile.name}
          activeChildId={activeChildProfile.id}
          inventoryEmpty={false}
        />
      </div>
    </section>
  );
}

function FirstStepDemoScreen({ activity, currentMoment }) {
  const openSections = getDefaultOpenSections({
    mission: false,
    role: false,
    starters: false,
    materials: false,
    steps: true,
    rescue: false,
    finish: false,
  });

  return (
    <section
      className="page-layout page-layout--kid demo-product-screen"
      aria-label="First activity step demo screen"
    >
      <section
        className="panel active-activity-panel pretend-active-panel quest-v2-panel demo-first-step-panel"
      >
        <p className="demo-screen-kicker">Activity started</p>
        <h1 className="simple-active-title">{activity.title}</h1>

        <div className="demo-first-step-only">
          <QuestContent
            activity={activity}
            mode="active"
            currentMoment={currentMoment}
            openSections={openSections}
            completedStepIndexes={[]}
            checkedStarterIndexes={[]}
            focusStepIndex={0}
            canUseAiHints={false}
          />
        </div>
      </section>
    </section>
  );
}

/**
 * Public deterministic marketing walkthrough.
 *
 * It mirrors the real product journey without auth, Supabase writes, or OpenAI:
 * Parent moment -> Kid choices -> three imaginative matches -> Details -> Step 1.
 */
function DemoPage() {
  const [stage, setStage] = useState("parent");
  const [kidEnergyLevel, setKidEnergyLevel] = useState("neutral");
  const [kidActivityStyle, setKidActivityStyle] = useState("imaginative");
  const [playingChildIds, setPlayingChildIds] = useState([
    DEMO_CHILDREN.maya.id,
  ]);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const demoMoment = getDemoMoment(DEMO_MOMENT_ID);
  const activeChildProfile = DEMO_CHILDREN.maya;

  const matchResult = useMemo(
    () =>
      matchDemoActivities({
        momentId: DEMO_MOMENT_ID,
        childId: DEMO_CHILD_ID,
        pool: IMAGINATIVE_DEMO_POOL,
        limit: 3,
      }),
    []
  );

  function togglePlayingChild(childId) {
    setPlayingChildIds((current) => {
      if (current.includes(childId)) {
        // Keep at least one child selected so the demo always has a valid player.
        return current.length === 1
          ? current
          : current.filter((id) => id !== childId);
      }
      return [...current, childId];
    });
  }

  function showResults() {
    // The movie is about the imaginative product experience, so force Pretend
    // before moving to the three matched activities.
    setKidActivityStyle("imaginative");
    setStage("results");
  }

  function startActivity(activity) {
    setSelectedActivity(activity);
    setStage("activity");
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
          <span className="demo-topbar-label">Product walkthrough</span>
        </div>
      </header>

      <main className="demo-page-main demo-page-main--product">
        {stage === "parent" ? (
          <ParentDemoScreen onContinue={() => setStage("kid")} />
        ) : null}

        {stage === "kid" ? (
          <div className="demo-product-screen" aria-label="Kid demo screen">
            <p className="demo-screen-kicker demo-screen-kicker--outside">Kid</p>
            <KidPage
              currentMoment={demoMoment.moment}
              kidEnergyLevel={kidEnergyLevel}
              setKidEnergyLevel={setKidEnergyLevel}
              kidActivityStyle={kidActivityStyle}
              setKidActivityStyle={setKidActivityStyle}
              handleGenerateKidActivities={showResults}
              handleStartSomethingForMe={() => {
                const firstActivity = matchResult.results[0]?.activity;
                if (firstActivity) startActivity(firstActivity);
              }}
              isLoading={false}
              loadingIntent=""
              activeChildProfile={activeChildProfile}
              activityMode="single-child"
              childProfiles={DEMO_CHILD_PROFILES}
              playingChildIds={playingChildIds}
              togglePlayingChild={togglePlayingChild}
              savedActivities={[]}
              activityHistory={[]}
              handleReplaySavedActivity={() => {}}
              isDemoMode={false}
              imBoredDisabled={false}
              firstRunPulseImBored={false}
              onFirstRunGenerated={() => {}}
              playModeLine=""
              kidDeviceMode={false}
              gettingBetterCopy=""
              setupNudgeNeeded={false}
            />
          </div>
        ) : null}

        {stage === "results" ? (
          <ResultsDemoScreen
            matchResult={matchResult}
            onStartActivity={startActivity}
            activeChildProfile={activeChildProfile}
          />
        ) : null}

        {stage === "activity" && selectedActivity ? (
          <FirstStepDemoScreen
            activity={selectedActivity}
            currentMoment={demoMoment.moment}
          />
        ) : null}
      </main>
    </div>
  );
}

export default DemoPage;
