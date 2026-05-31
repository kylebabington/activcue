// src/pages/QuestPage.jsx

import { Link } from "react-router-dom";
import ActiveActivityPanel from "../components/ActiveActivityPanel";
import ActivityResults from "../components/ActivityResults";

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

// This page owns the quest experience.
// It shows the current running quest and the generated quest choices.

function QuestPage({
    currentMoment,
    activeActivity,
    timerSecondsRemaining,
    finishActiveActivity,
    cancelActiveActivity,
    handleTimerNotFinished,
    handleTimerNeedAnotherIdea,
    handleTimerMoreLikeThis,
    goToNextQuestStep,
    goToPreviousQuestStep,
    toggleShowAllQuestSteps,
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
            <section className="hero-card">
                <p className="eyebrow">Quest Board</p>

                <h1>Pick a clear next move.</h1>

                <p>
                    Choose a quest, start the timer, and let the activity guide the kid.
                </p>
            </section>

            {currentMoment && (
                <section className="current-moment-banner">
                    <div>
                        <p className="eyebrow dark">Right now</p>

                        <h2>{currentMoment.parentActivity}</h2>

                        <p>
                            These quests are tuned for this family moment.
                        </p>
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

            {activeActivity && (
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
                    toggleShowAllQuestSteps={toggleShowAllQuestSteps}
                    formatTimer={formatTimer}
                />
            )}

            {!activeActivity && activities.length > 0 && !isLoading && (
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

            {!activeActivity && activities.length === 0 && !isLoading && (
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