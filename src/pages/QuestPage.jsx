// src/pages/QuestPage.jsx

import { Link } from "react-router-dom";
import ActiveActivityPanel from "../components/ActiveActivityPanel";
import ActivityResults from "../components/ActivityResults";
import MomentStatusBanner from "../components/MomentStatusBanner";
import SimpleActiveActivityPanel from "../components/SimpleActiveActivityPanel";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../hooks/useAuth";
import { INDEPENDENCE_OUTCOMES } from "../features/quest";
import { trackProductEvent } from "../utils/analytics";

function QuestCompleteSummary({
    lastCompletedQuest,
    clearLastCompletedQuest,
    handleCompletedQuestMoreLikeThis,
    handleCompletedQuestNeedAnotherIdea,
    saveFavoriteActivity,
    reapplyLastSuccessfulMoment,
    onSessionOutcome,
    showActivationSignup = false,
}) {
    const uses = Array.isArray(lastCompletedQuest.uses)
        ? lastCompletedQuest.uses
        : [];

    const completedStepCount = Number(lastCompletedQuest.completedStepCount) || 0;
    const totalStepCount = Number(lastCompletedQuest.totalStepCount) || 0;

    const completionLabel = "Activity complete";
    const isSimpleActivity = lastCompletedQuest.activityStyle === "simple";
    const selectedOutcome = lastCompletedQuest.independenceRating || "";

    const progressText =
        totalStepCount > 0
            ? `${completedStepCount} of ${totalStepCount} steps completed`
            : completionLabel;

    return (
        <section className="panel quest-complete-summary">
            <p className="completion-kicker">{completionLabel}</p>

            <h2>{lastCompletedQuest.title}</h2>

            {!isSimpleActivity && lastCompletedQuest.theme && (
                <p className="activity-theme">{lastCompletedQuest.theme}</p>
            )}

            <div className="completion-stat-grid">
                <div>
                    <span>Progress</span>
                    <strong>{progressText}</strong>
                </div>

                {lastCompletedQuest.minutesWorked && (
                    <div>
                        <span>Time spent</span>
                        <strong>{lastCompletedQuest.minutesWorked} min</strong>
                    </div>
                )}

                {uses.length > 0 && (
                    <div>
                        <span>Used</span>
                        <strong>{uses.slice(0, 3).join(", ")}</strong>
                    </div>
                )}
            </div>

            {typeof onSessionOutcome === "function" ? (
                <div className="independence-outcome" role="group" aria-label="How independent was this?">
                    <p className="independence-outcome-prompt">
                        Did this buy you the time?
                    </p>
                    <div className="independence-outcome-actions">
                        {INDEPENDENCE_OUTCOMES.map((outcome) => (
                            <button
                                key={outcome.value}
                                type="button"
                                className={
                                    selectedOutcome === outcome.value
                                        ? "independence-outcome-button is-selected"
                                        : "independence-outcome-button"
                                }
                                onClick={() => onSessionOutcome(outcome.value)}
                            >
                                {outcome.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="completion-ritual-actions">
                {lastCompletedQuest.activity ? (
                    <button
                        type="button"
                        className="secondary-action"
                        onClick={() =>
                            saveFavoriteActivity?.(lastCompletedQuest.activity)
                        }
                    >
                        Save favorite?
                    </button>
                ) : null}

                {typeof reapplyLastSuccessfulMoment === "function" ? (
                    <button
                        type="button"
                        className="secondary-action"
                        onClick={reapplyLastSuccessfulMoment}
                    >
                        Same moment next time?
                    </button>
                ) : null}
            </div>

            {showActivationSignup ? (
                <div className="activation-signup-panel">
                    <h3>Remember what worked?</h3>
                    <p>
                        Create a free account so favorites, kids, and What Works
                        for Us stay with your family.
                    </p>
                    <Link
                        className="primary-link-button"
                        to="/signup"
                        onClick={() =>
                            trackProductEvent("activation_signup_prompted", {
                                source: "quest_complete",
                            })
                        }
                    >
                        Create free account
                    </Link>
                </div>
            ) : null}

            <div className="completion-actions">
                <button onClick={handleCompletedQuestMoreLikeThis}>
                    More like this
                </button>

                <button
                    className="secondary-action"
                    onClick={handleCompletedQuestNeedAnotherIdea}
                >
                    Need another idea
                </button>

                <button
                    className="ghost-button"
                    onClick={clearLastCompletedQuest}
                >
                    Close summary
                </button>

                <Link className="primary-link-button" to="/kid">
                    Back to Kid Mode
                </Link>
            </div>
        </section>
    );
}

// This page owns the quest experience.
// It shows the current running quest and the generated quest choices.

function QuestPage() {
    const {
        currentMoment,
        activeActivity,
        lastCompletedQuest,
        clearLastCompletedQuest,
        handleCompletedQuestMoreLikeThis,
        handleCompletedQuestNeedAnotherIdea,
        timerSecondsRemaining,
        finishActiveActivity,
        cancelActiveActivity,
        handleTimerNotFinished,
        handleTimerNeedAnotherIdea,
        handleTimerMoreLikeThis,
        goToNextQuestStep,
        goToPreviousQuestStep,
        toggleQuestStepComplete,
        setQuestPhase,
        toggleStarterIdea,
        assignRole,
        toggleBuiltInHelp,
        setOpenSection,
        openRescueSection,
        markRescueModeUsed,
        stepHint,
        isHintLoading,
        handleNeedStepHint,
        formatTimer,
        activities,
        scoredActivities,
        isLoading,
        handleStartActivity,
        saveFavoriteActivity,
        entitlement,
        reapplyLastSuccessfulMoment,
        activitySessions,
        activeChildProfile,
        selectedChildProfiles,
        handleTooMessy,
        handleTooHard,
        handleNeedQuieter,
        handleMoreLikeThis,
        handleTryNextBest,
        handleAutoPickQuest,
        handleSessionOutcome,
        inventoryEmpty,
        gettingBetterCopy,
    } = useAppContext();
    const { isAnonymous } = useAuth();

    const playingChildren =
        Array.isArray(selectedChildProfiles) && selectedChildProfiles.length > 0
            ? selectedChildProfiles
            : activeChildProfile
              ? [activeChildProfile]
              : [];

    return (
        <section className="page-layout page-layout--kid">
            <section className="page-intro page-intro--kid page-intro--minimal">
                <h1>What should happen next?</h1>
                {gettingBetterCopy ? (
                    <p className="kid-getting-better" role="status">
                        {gettingBetterCopy}
                    </p>
                ) : null}
            </section>

            <div className="kid-center-column">
                <MomentStatusBanner currentMoment={currentMoment} kidFacing />

            {activeActivity?.activityStyle === "simple" && (
                <SimpleActiveActivityPanel
                    activeActivity={activeActivity}
                    currentMoment={currentMoment}
                    stepHint={stepHint}
                    isHintLoading={isHintLoading}
                    handleNeedStepHint={handleNeedStepHint}
                    canUseAiHints={Boolean(entitlement?.canUseAiHints)}
                    finishActiveActivity={finishActiveActivity}
                    cancelActiveActivity={cancelActiveActivity}
                />
            )}

            {activeActivity && activeActivity.activityStyle !== "simple" && (
                <ActiveActivityPanel
                    activeActivity={activeActivity}
                    currentMoment={currentMoment}
                    timerSecondsRemaining={timerSecondsRemaining}
                    finishActiveActivity={finishActiveActivity}
                    cancelActiveActivity={cancelActiveActivity}
                    handleTimerNotFinished={handleTimerNotFinished}
                    handleTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
                    handleTimerMoreLikeThis={handleTimerMoreLikeThis}
                    goToNextQuestStep={goToNextQuestStep}
                    goToPreviousQuestStep={goToPreviousQuestStep}
                    toggleQuestStepComplete={toggleQuestStepComplete}
                    setQuestPhase={setQuestPhase}
                    toggleStarterIdea={toggleStarterIdea}
                    assignRole={assignRole}
                    toggleBuiltInHelp={toggleBuiltInHelp}
                    setOpenSection={setOpenSection}
                    openRescueSection={openRescueSection}
                    markRescueModeUsed={markRescueModeUsed}
                    stepHint={stepHint}
                    isHintLoading={isHintLoading}
                    handleNeedStepHint={handleNeedStepHint}
                    canUseAiHints={Boolean(entitlement?.canUseAiHints)}
                    formatTimer={formatTimer}
                    playingChildren={playingChildren}
                />
            )}

            {!activeActivity && lastCompletedQuest && (
                <QuestCompleteSummary
                    lastCompletedQuest={lastCompletedQuest}
                    clearLastCompletedQuest={clearLastCompletedQuest}
                    handleCompletedQuestMoreLikeThis={handleCompletedQuestMoreLikeThis}
                    handleCompletedQuestNeedAnotherIdea={handleCompletedQuestNeedAnotherIdea}
                    saveFavoriteActivity={saveFavoriteActivity}
                    reapplyLastSuccessfulMoment={reapplyLastSuccessfulMoment}
                    onSessionOutcome={handleSessionOutcome}
                    showActivationSignup={Boolean(isAnonymous)}
                />
            )}

            {!activeActivity &&
                !lastCompletedQuest &&
                activities.length > 0 &&
                !isLoading && (
                    <section className="panel auto-pick-panel">
                        <div>
                            <h2>Want the app to choose?</h2>

                            <p>
                                Skip comparing options. The app will choose the activity that best fits right now.
                            </p>
                        </div>

                        <button className="generate-button" onClick={handleAutoPickQuest}>
                            Just pick one for me
                        </button>
                    </section>
                )}

            {!activeActivity && !lastCompletedQuest && activities.length === 0 && !isLoading && (
                <section className="panel">
                    <h2>Waiting for Kid</h2>

                    <p>
                        Set a parent moment, then open Kid and tap I&apos;m Bored
                        (or Quick ideas) to fill this board.
                    </p>

                    <div className="activity-empty-actions">
                        <Link className="primary-link-button" to="/kid">
                            Go to Kid
                        </Link>
                        <Link className="secondary-action" to="/parent">
                            Set a moment
                        </Link>
                    </div>
                </section>
            )}
            </div>

            {!activeActivity && !lastCompletedQuest && (
                <div className="activity-board-column">
                    <ActivityResults
                        activities={activities}
                        scoredActivities={scoredActivities}
                        isLoading={isLoading}
                        currentMoment={currentMoment}
                        handleStartActivity={handleStartActivity}
                        saveFavoriteActivity={saveFavoriteActivity}
                        handleTooMessy={handleTooMessy}
                        handleTooHard={handleTooHard}
                        handleNeedQuieter={handleNeedQuieter}
                        handleMoreLikeThis={handleMoreLikeThis}
                        handleTryNextBest={handleTryNextBest}
                        activitySessions={activitySessions}
                        activeChildName={activeChildProfile?.name || ""}
                        activeChildId={activeChildProfile?.id || ""}
                        inventoryEmpty={inventoryEmpty}
                    />
                </div>
            )}
        </section>
    );
}

export default QuestPage;