// src/components/ActivityResults.jsx

import { useState } from "react";
import { ActivityDetailsModal } from "./ActivityDetailsModal";
import { getVerifiedFitFacts, buildWhyThisFits } from "../utils/inventoryFit";
import { buildRecommendationReasons } from "../utils/confidenceCopy";

function ActivityResults({
  activities,
  scoredActivities,
  isLoading,
  currentMoment,
  handleStartActivity,
  saveFavoriteActivity,
  handleTooMessy,
  handleTooHard,
  handleNeedQuieter,
  handleMoreLikeThis,
  handleTryNextBest,
  activitySessions = [],
  activeChildName = "",
  activeChildId = "",
  inventoryEmpty = false,
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

  const canTryNextBest =
    typeof handleTryNextBest === "function" && displayActivities.length >= 2;

  return (
    <>
      <section className="panel results-panel activity-board-panel">
        <div className="panel-header">
          <div>
            <h2>Pick something to do</h2>
            {inventoryEmpty ? (
              <p className="settings-note">
                Mark a few supplies in Settings so &quot;why this fits&quot; can
                name toys you actually have.
              </p>
            ) : null}
            {canTryNextBest ? (
              <button
                type="button"
                className="secondary-action plan-b-button"
                onClick={handleTryNextBest}
              >
                Try the next best one
              </button>
            ) : null}
          </div>
        </div>

        <div className="quest-choice-list quest-choice-list--horizontal">
          {displayActivities.map((scoredActivity, index) => {
            const activity = scoredActivity.activity;
            const score = scoredActivity.score;
            const isSimpleActivity = activity.activityStyle === "simple";
            const isBestFit = index === 0 && typeof score === "number";
            const feedbackIsOpen = feedbackActivityTitle === activity.title;
            const fitFacts = getVerifiedFitFacts(activity, currentMoment);
            const whyThisFits = buildWhyThisFits(activity, currentMoment);
            const recommendationReasons = buildRecommendationReasons(
              activity,
              activitySessions,
              activeChildName,
              { childId: activeChildId, currentMoment }
            );

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

                    {whyThisFits ? (
                      <p className="why-this-fits">{whyThisFits}</p>
                    ) : null}

                    {recommendationReasons.length > 0 ? (
                      <ul className="recommendation-reasons">
                        {recommendationReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}

                    {fitFacts.length > 0 && (
                      <div className="fit-fact-chip-row">
                        {fitFacts.map((fact) => (
                          <span key={fact} className="fit-fact-chip">
                            {fact}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="quest-choice-actions">
                    <button
                      type="button"
                      className="quest-start-button"
                      onClick={() => handleStartActivity(activity)}
                    >
                      {activity.isLocked ? "Unlock free" : "Start"}
                    </button>

                    <button
                      type="button"
                      className="text-action"
                      onClick={() => openDetails(activity.title)}
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      className="text-action"
                      onClick={() => toggleFeedback(activity.title)}
                    >
                      Not this
                    </button>

                    <button
                      type="button"
                      className="text-action"
                      onClick={() => handleMoreLikeThis(activity)}
                    >
                      More like this
                    </button>
                  </div>
                </div>

                {feedbackIsOpen && (
                  <div className="not-this-feedback">
                    <h4>Why not this one?</h4>

                    <div className="feedback-buttons compact-feedback-buttons">
                      <button
                        type="button"
                        onClick={() => handleTooMessy(activity)}
                      >
                        Too messy
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTooHard(activity)}
                      >
                        Too hard
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNeedQuieter(activity)}
                      >
                        Too loud
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
        currentMoment={currentMoment}
        isOpen={Boolean(detailsEntry)}
        onClose={closeDetails}
        handleStartActivity={handleStartActivity}
        saveFavoriteActivity={saveFavoriteActivity}
      />
    </>
  );
}

export default ActivityResults;
