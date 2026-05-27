// src/pages/QuestPage.jsx

import { Link } from "react-router-dom";
import ActiveActivityPanel from "../components/ActiveActivityPanel";
import ActivityResults from "../components/ActivityResults";

// This page owns the quest experience.
// It shows the current running quest and the generated quest choices.

function QuestPage({
    activeActivity,
    timerSecondsRemaining,
    finishActiveActivity,
    cancelActiveActivity,
    handleTimerNotFinished,
    handleTimerNeedAnotherIdea,
    handleTimerMoreLikeThis,
    formatTimer,
    activities,
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

            {activeActivity && (
                <ActiveActivityPanel
                    activeActivity={activeActivity}
                    timerSecondsRemaining={timerSecondsRemaining}
                    finishActiveActivity={finishActiveActivity}
                    cancelActiveActivity={cancelActiveActivity}
                    handleTimerNotFinished={handleTimerNotFinished}
                    handleTimerNeedAnotherIdea={handleTimerNeedAnotherIdea}
                    handleTimerMoreLikeThis={handleTimerMoreLikeThis}
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