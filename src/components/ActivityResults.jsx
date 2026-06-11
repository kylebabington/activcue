// src/components/ActivityResults.jsx

import { useState } from "react";
import {
  formatActivityStyleLabel,
  formatAdultHelpLabel,
  formatEnergyLabel,
  formatEstimatedMinutes,
  formatMessLabel,
} from "../utils/activityFormatters";

// This component displays the activity choices returned by the AI.
//
// Product goal:
// Do NOT overwhelm the kid with three huge walls of text.
// First show compact quest cards.
// Then let the kid open details only when they want them.
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
  // expandedActivityTitle stores the title of the quest whose details are open.
  //
  // Example:
  // expandedActivityTitle = "Stuffed Animal Rescue"
  //
  // If it is null, no quest details are open.
  const [expandedActivityTitle, setExpandedActivityTitle] = useState(null);

  // feedbackActivityTitle stores the title of the quest whose "Not this one"
  // feedback buttons are currently visible.
  //
  // This keeps the card clean until the user actually wants to reject it.
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

  function toggleDetails(activityTitle) {
    // If this activity is already open, close it.
    if (expandedActivityTitle === activityTitle) {
      setExpandedActivityTitle(null);
      return;
    }

    // Otherwise, open this activity and close the others.
    setExpandedActivityTitle(activityTitle);
  }

  function toggleFeedback(activityTitle) {
    // If this feedback panel is already open, close it.
    if (feedbackActivityTitle === activityTitle) {
      setFeedbackActivityTitle(null);
      return;
    }

    // Otherwise, open feedback for this activity only.
    setFeedbackActivityTitle(activityTitle);
  }

  // Prefer scored activities when App.jsx provides them.
  // If they are missing for any reason, fall back to plain activities.
  const displayActivities =
    Array.isArray(scoredActivities) && scoredActivities.length > 0
      ? scoredActivities
      : activities.map((activity) => {
        return {
          activity,
          score: null,
        };
      });

  return (
    <section className="panel results-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow dark">Activity Board</p>

          <h2>Pick something to do</h2>

          <p>
            Choose one to start, or open details if you want to see the steps first.
          </p>
        </div>
      </div>

      <div className="quest-choice-list">
        {displayActivities.map((scoredActivity, index) => {
          // scoredActivity is a wrapper object:
          //
          // {
          //   activity: { title, steps, mess, energy, etc. },
          //   score: 18
          // }
          const activity = scoredActivity.activity;
          const score = scoredActivity.score;

          // Simple activities should be displayed differently from imaginative quests.
          // This is the key UI branch for the result cards.
          const isSimpleActivity = activity.activityStyle === "simple";

          const activityStyleLabel = formatActivityStyleLabel(activity.activityStyle);

          // Because App.jsx sorts scoredActivities highest score first,
          // the first item is the best match.
          const isBestFit = index === 0 && typeof score === "number";
          // Defensive cleanup:
          // The AI should return arrays, but we still protect the UI
          // in case something comes back missing or malformed.
          const steps = Array.isArray(activity.steps) ? activity.steps : [];
          const uses = Array.isArray(activity.uses) ? activity.uses : [];
          const roles = Array.isArray(activity.roles) ? activity.roles : [];
          const starterPrompts = Array.isArray(activity.starterPrompts)
            ? activity.starterPrompts
            : [];
          const firstMoves = Array.isArray(activity.firstMoves)
            ? activity.firstMoves
            : [];
          const extensionIdeas = Array.isArray(activity.extensionIdeas)
            ? activity.extensionIdeas
            : [];

          // These helper values convert raw activity fields into friendly UI labels.
          const estimatedMinutesLabel = formatEstimatedMinutes(
            activity.estimatedMinutes
          );
          const messLabel = formatMessLabel(activity.mess);
          const energyLabel = formatEnergyLabel(activity.energy);
          const adultHelpLabel = formatAdultHelpLabel(activity.adultHelp);

          // These booleans make the JSX easier to read.
          const detailsAreOpen = expandedActivityTitle === activity.title;
          const feedbackIsOpen = feedbackActivityTitle === activity.title;

          return (
            <article key={activity.title} className="quest-choice-card">
              <div className="quest-choice-main">
                <div>
                  <div className="quest-card-topline">
                    <span
                      className={
                        isSimpleActivity
                          ? "activity-style-badge simple-style-badge"
                          : "activity-style-badge pretend-style-badge"
                      }
                    >
                      {activityStyleLabel}
                    </span>

                    {isBestFit && (
                      <span className="best-fit-badge">Best fit right now</span>
                    )}

                    {typeof score === "number" && (
                      <span className="fit-score-badge">Fit score: {score}</span>
                    )}
                  </div>

                  <h3>{activity.title}</h3>

                  {!isSimpleActivity && activity.theme && (
                    <p className="activity-theme">{activity.theme}</p>
                  )}

                  {activity.summary && (
                    <p className="quest-short-summary">{activity.summary}</p>
                  )}

                  <div className="activity-meta compact-meta">
                    {estimatedMinutesLabel && <span>{estimatedMinutesLabel}</span>}

                    <span>{steps.length} steps</span>

                    {messLabel && <span>{messLabel}</span>}

                    {energyLabel && <span>{energyLabel}</span>}

                    {adultHelpLabel && <span>{adultHelpLabel}</span>}

                    {uses.length > 0 && (
                      <span>Uses: {uses.slice(0, 3).join(", ")}</span>
                    )}
                  </div>
                </div>

                <div className="quest-choice-actions">
                  <button onClick={() => handleStartActivity(activity)}>
                    Start
                  </button>

                  <button
                    className="secondary-action"
                    onClick={() => toggleDetails(activity.title)}
                  >
                    {detailsAreOpen ? "Hide details" : "See details"}
                  </button>

                  <button
                    className="ghost-button"
                    onClick={() => toggleFeedback(activity.title)}
                  >
                    Not this one
                  </button>
                </div>
              </div>

              {detailsAreOpen && (
                <div className="quest-details">
                  {!isSimpleActivity && activity.kidRole && (
                    <div className="quest-box role-box">
                      <h4>Your role</h4>
                      <p>{activity.kidRole}</p>
                    </div>
                  )}

                  {!isSimpleActivity && activity.mission && (
                    <div className="quest-box mission-box">
                      <h4>Your mission</h4>
                      <p>{activity.mission}</p>
                    </div>
                  )}

                  {!isSimpleActivity && starterPrompts.length > 0 && (
                    <div className="quest-box prompt-box">
                      <h4>Starter prompts</h4>

                      <ul>
                        {starterPrompts.map((prompt) => (
                          <li key={prompt}>{prompt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!isSimpleActivity && firstMoves.length > 0 && (
                    <div className="quest-box first-moves-box">
                      <h4>First moves</h4>

                      <ol>
                        {firstMoves.map((move) => (
                          <li key={move}>{move}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {!isSimpleActivity && roles.length > 0 && (
                    <div className="quest-box roles-box">
                      <h4>Roles</h4>

                      <ul>
                        {roles.map((role) => (
                          <li key={role}>{role}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {steps.length > 0 && (
                    <div className="quest-box">
                      <h4>{isSimpleActivity ? "Steps" : "Quest steps"}</h4>

                      <ol>
                        {steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {!isSimpleActivity && extensionIdeas.length > 0 && (
                    <div className="quest-box extension-box">
                      <h4>Keep going</h4>

                      <ul>
                        {extensionIdeas.map((idea) => (
                          <li key={idea}>{idea}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activity.whyItFits && (
                    <div className="quest-box why-it-fits-box">
                      <h4>Why this fits right now</h4>

                      {typeof score === "number" && (
                        <p className="fit-score-note">
                          {isSimpleActivity
                            ? `This activity scored ${score} against the current family moment.`
                            : `This quest scored ${score} against the current family moment.`}
                        </p>
                      )}

                      <p>{activity.whyItFits}</p>
                    </div>
                  )}

                  {uses.length > 0 && (
                    <p className="uses-list">Uses: {uses.join(", ")}</p>
                  )}

                  <div className="details-actions">
                    <button onClick={() => handleStartActivity(activity)}>
                      {isSimpleActivity ? "Start this activity" : "Start this quest"}
                    </button>

                    <button
                      className="secondary-action"
                      onClick={() => saveFavoriteActivity(activity)}
                    >
                      Save favorite
                    </button>
                  </div>
                </div>
              )}

              {feedbackIsOpen && (
                <div className="not-this-feedback">
                  <h4>Why not this one?</h4>

                  <div className="feedback-buttons compact-feedback-buttons">
                    <button onClick={() => handleTooMessy(activity)}>
                      Too messy
                    </button>

                    <button onClick={() => handleTooHard(activity)}>
                      Too hard
                    </button>

                    <button onClick={() => handleNeedQuieter(activity)}>
                      Too loud
                    </button>

                    <button onClick={() => handleMoreLikeThis(activity)}>
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
  );
}

export default ActivityResults;