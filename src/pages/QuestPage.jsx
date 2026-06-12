// src/pages/QuestPage.jsx

import { Link } from "react-router-dom";
import ActiveActivityPanel from "../components/ActiveActivityPanel";
import ActivityResults from "../components/ActivityResults";
import MomentStatusBanner from "../components/MomentStatusBanner";
import SimpleActiveActivityPanel from "../components/SimpleActiveActivityPanel";
import { useAppContext } from "../context/AppContext";

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

    const isSimpleActivity = lastCompletedQuest.activityStyle === "simple";

    const completionLabel = isSimpleActivity
        ? "Activity complete"
        : "Quest complete";

    const progressText =
        totalStepCount > 0
            ? `${completedStepCount} of ${totalStepCount} steps completed`
            : completionLabel;

    return (
        <section className="panel quest-complete-summary">
            <p className="eyebrow dark">{completionLabel}</p>

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
    } = useAppContext();
    return (
        <section className="page-layout page-layout--kid">
            <section className="page-intro page-intro--kid">
                <p className="eyebrow dark">Activity Board</p>

                <h1>What should happen next?</h1>
            </section>

            <div className="kid-center-column">
                <MomentStatusBanner currentMoment={currentMoment} />

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
                    <h2>No activities yet</h2>

                    <p>
                        Go to Kid Mode and choose what kind of activity you want.
                    </p>

                    <Link className="primary-link-button" to="/kid">
                        Go to Kid Mode
                    </Link>
                </section>
            )}
            </div>

            {!activeActivity && !lastCompletedQuest && (
                <div className="activity-board-column">
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
                </div>
            )}
        </section>
    );
}

export default QuestPage;