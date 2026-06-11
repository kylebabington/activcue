// src/pages/QuestPage.jsx

import { Link } from "react-router-dom";
import ActiveActivityPanel from "../components/ActiveActivityPanel";
import ActivityResults from "../components/ActivityResults";
import SimpleActiveActivityPanel from "../components/SimpleActiveActivityPanel";

function formatAvailabilityForBanner(availability) {
    // Convert internal availability values into friendly text.
    if (availability === "helper-welcome") {
        return "Helper welcome";
    }

    if (availability === "ask-first") {
        return "Ask first";
    }

    if (availability === "do-not-interrupt") {
        return "Do not interrupt";
    }

    if (availability === "available") {
        return "Available";
    }

    return "Check first";
}

function formatNoiseForBanner(noiseLevel) {
    // Convert internal noise values into friendly text.
    if (noiseLevel === "quiet") {
        return "Quiet";
    }

    if (noiseLevel === "normal") {
        return "Normal noise";
    }

    if (noiseLevel === "loud") {
        return "Loud okay";
    }

    return "Noise not set";
}

function formatMessForBanner(messLevel) {
    // Convert internal mess values into friendly text.
    if (messLevel === "low") {
        return "Low mess";
    }

    if (messLevel === "medium") {
        return "Medium mess";
    }

    if (messLevel === "high") {
        return "Messy okay";
    }

    return "Mess not set";
}

function formatSupervisionForBanner(supervisionLevel) {
    // Convert internal supervision values into friendly text.
    if (supervisionLevel === "independent") {
        return "No adult help";
    }

    if (supervisionLevel === "mostly-independent") {
        return "Mostly independent";
    }

    if (supervisionLevel === "nearby") {
        return "Adult nearby";
    }

    return "Supervision not set";
}

function QuestCompleteSummary({
    lastCompletedQuest,
    clearLastCompletedQuest,
    handleCompletedQuestMoreLikeThis,
    handleCompletedQuestNeedAnotherIdea,
}) {
    const uses = Array.isArray(lastCompletedQuest.uses)
        ? lastCompletedQuest.uses
        : [];

    const completedStepCount = Number(lastCompletedQuest.completedStepCount) || 0;
    const totalStepCount = Number(lastCompletedQuest.totalStepCount) || 0;

    const progressText =
        totalStepCount > 0
            ? `${completedStepCount} of ${totalStepCount} steps completed`
            : "Quest completed";

    return (
        <section className="panel quest-complete-summary">
            <p className="eyebrow dark">Quest complete</p>

            <h2>{lastCompletedQuest.title}</h2>

            {lastCompletedQuest.theme && (
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

function QuestPage({
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
    toggleShowAllQuestSteps,
    stepHint,
    isHintLoading,
    handleNeedStepHint,
    formatTimer,
    activities,
    scoredActivities,
    isLoading,
    handleStartActivity,
    saveFavoriteActivity,
    handleTooMessy,
    handleTooHard,
    handleNeedQuieter,
    handleMoreLikeThis,
    handleAutoPickQuest,
}) {
    return (
        <section className="page-layout">
            <section className="hero-card compact-hero-card">
                <p className="eyebrow">Activity Board</p>

                <h1>What should happen next?</h1>

                <p>
                    Start a saved activity, pick a new one, or follow what is already in progress.
                </p>
            </section>

            {currentMoment && (
                <section className="current-moment-banner">
                    <div>
                        <p className="eyebrow dark">Right now</p>

                        <h2>{currentMoment.parentActivity}</h2>

                        <p>Tuned for right now.</p>
                    </div>

                    <div className="moment-chip-list">
                        <span>{formatAvailabilityForBanner(currentMoment.availability)}</span>

                        <span>{Number(currentMoment.timeNeededMinutes) || 20} min</span>

                        <span>{currentMoment.space || "Space not set"}</span>

                        <span>{formatNoiseForBanner(currentMoment.noiseLevel)}</span>

                        <span>{formatMessForBanner(currentMoment.messLevel)}</span>

                        <span>{formatSupervisionForBanner(currentMoment.supervisionLevel)}</span>
                    </div>
                </section>
            )}

            {activeActivity?.activityStyle === "simple" && (
                <SimpleActiveActivityPanel
                    activeActivity={activeActivity}
                    stepHint={stepHint}
                    handleNeedStepHint={handleNeedStepHint}
                    finishActiveActivity={finishActiveActivity}
                    cancelActiveActivity={cancelActiveActivity}
                />
            )}

            {activeActivity && activeActivity.activityStyle !== "simple" && (
                <ActiveActivityPanel
                    activeActivity={activeActivity}
                    timerSecondsRemaining={timerSecondsRemaining}
                    finishActiveActivity={finishActiveActivity}
                    cancelActiveActivity={cancelActiveActivity}
                    handleTimerNotFinished={handleTimerNotFinished}
                    handleTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
                    handleTimerMoreLikeThis={handleTimerMoreLikeThis}
                    goToNextQuestStep={goToNextQuestStep}
                    goToPreviousQuestStep={goToPreviousQuestStep}
                    toggleQuestStepComplete={toggleQuestStepComplete}
                    toggleShowAllQuestSteps={toggleShowAllQuestSteps}
                    stepHint={stepHint}
                    isHintLoading={isHintLoading}
                    handleNeedStepHint={handleNeedStepHint}
                    formatTimer={formatTimer}
                />
            )}

            {!activeActivity && lastCompletedQuest && (
                <QuestCompleteSummary
                    lastCompletedQuest={lastCompletedQuest}
                    clearLastCompletedQuest={clearLastCompletedQuest}
                    handleCompletedQuestMoreLikeThis={handleCompletedQuestMoreLikeThis}
                    handleCompletedQuestNeedAnotherIdea={handleCompletedQuestNeedAnotherIdea}
                />
            )}

            {!activeActivity &&
                !lastCompletedQuest &&
                activities.length > 0 &&
                !isLoading && (
                    <section className="panel auto-pick-panel">
                        <div>
                            <p className="eyebrow dark">Decision helper</p>

                            <h2>Want the app to choose?</h2>

                            <p>
                                Skip comparing options. The app will choose the quest that best fits right now.
                            </p>
                        </div>

                        <button className="generate-button" onClick={handleAutoPickQuest}>
                            Just pick one for me
                        </button>
                    </section>
                )}

            {!activeActivity && !lastCompletedQuest && (
                <ActivityResults
                    activities={activities}
                    scoredActivities={scoredActivities}
                    isLoading={isLoading}
                    handleStartActivity={handleStartActivity}
                    saveFavoriteActivity={saveFavoriteActivity}
                    handleTooMessy={handleTooMessy}
                    handleTooHard={handleTooHard}
                    handleNeedQuieter={handleNeedQuieter}
                    handleMoreLikeThis={handleMoreLikeThis}
                />
            )}

            {!activeActivity && !lastCompletedQuest && activities.length === 0 && !isLoading && (
                <section className="panel">
                    <h2>No quests yet</h2>

                    <p>
                        Go to Kid Mode and choose what kind of activity you want.
                    </p>

                    <Link className="primary-link-button" to="/kid">
                        Go to Kid Mode
                    </Link>
                </section>
            )}
        </section>
    );
}

export default QuestPage;