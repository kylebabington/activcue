// src/components/ActivityResults.jsx

import { useState } from "react";
import { ActivityDetailsModal } from "./ActivityDetailsModal";

function ActivityResults({
  activities,
  scoredActivities,
  isLoading,
  handleStartActivity,
  saveFavoriteActivity,
  handleTooMessy,
  handleTooHard,
  handleNeedQuieter,
  handleMoreLikeThis,
}) {
  const [detailsActivityTitle, setDetailsActivityTitle] = useState(null);
  const [feedbackActivityTitle, setFeedbackActivityTitle] = useState(null);

  if (isLoading) {
    return (
      <section className="panel loading-panel">
        <h2>Thinking up activities...</h2>

        <p>
          Finding something that fits your home, supplies, and the current
          family moment.
        </p>
      </section>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  function openDetails(activityTitle) {
    setDetailsActivityTitle(activityTitle);
  }

  function closeDetails() {
    setDetailsActivityTitle(null);
  }

  function toggleFeedback(activityTitle) {
    if (feedbackActivityTitle === activityTitle) {
      setFeedbackActivityTitle(null);
      return;
    }

    setFeedbackActivityTitle(activityTitle);
  }

  const displayActivities =
    Array.isArray(scoredActivities) && scoredActivities.length > 0
      ? scoredActivities
      : activities.map((activity) => ({
          activity,
          score: null,
        }));

  const detailsEntry = displayActivities.find(
    (entry) => entry.activity.title === detailsActivityTitle
  );

  return (
    <>
      <section className="panel results-panel activity-board-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow dark">Activity Board</p>
            <h2>Pick something to do</h2>
          </div>
        </div>

        <div className="quest-choice-list quest-choice-list--horizontal">
          {displayActivities.map((scoredActivity, index) => {
            const activity = scoredActivity.activity;
            const score = scoredActivity.score;
            const isSimpleActivity = activity.activityStyle === "simple";
            const isBestFit = index === 0 && typeof score === "number";
            const feedbackIsOpen = feedbackActivityTitle === activity.title;

            return (
              <article key={activity.title} className="quest-choice-card">
                <div className="quest-choice-main">
                  <div className="quest-choice-body">
                    {isBestFit && (
                      <div className="quest-card-topline">
                        <span className="best-fit-badge">Best fit</span>
                      </div>
                    )}

                    <h3>{activity.title}</h3>

                    {!isSimpleActivity && activity.theme && (
                      <p className="activity-theme">{activity.theme}</p>
                    )}

                    {activity.summary && (
                      <p className="quest-short-summary">{activity.summary}</p>
                    )}
                  </div>

                  <div className="quest-choice-actions">
                    <button type="button" onClick={() => handleStartActivity(activity)}>
                      Start
                    </button>

                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => openDetails(activity.title)}
                    >
                      See details
                    </button>

                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => toggleFeedback(activity.title)}
                    >
                      Not this one
                    </button>
                  </div>
                </div>

                {feedbackIsOpen && (
                  <div className="not-this-feedback">
                    <h4>Why not this one?</h4>

                    <div className="feedback-buttons compact-feedback-buttons">
                      <button type="button" onClick={() => handleTooMessy(activity)}>
                        Too messy
                      </button>

                      <button type="button" onClick={() => handleTooHard(activity)}>
                        Too hard
                      </button>

                      <button type="button" onClick={() => handleNeedQuieter(activity)}>
                        Too loud
                      </button>

                      <button type="button" onClick={() => handleMoreLikeThis(activity)}>
                        More like this
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <ActivityDetailsModal
        activity={detailsEntry?.activity ?? null}
        score={detailsEntry?.score ?? null}
        isOpen={Boolean(detailsEntry)}
        onClose={closeDetails}
        handleStartActivity={handleStartActivity}
        saveFavoriteActivity={saveFavoriteActivity}
      />
    </>
  );
}

export default ActivityResults;
