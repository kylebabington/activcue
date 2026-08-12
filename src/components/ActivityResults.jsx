import { useState } from "react";
import { ActivityDetailsModal } from "./ActivityDetailsModal";
import { GenerationLoader } from "./GenerationLoader";
import { getVerifiedFitFacts, buildWhyThisFits } from "../utils/inventoryFit";
import { buildRecommendationReasons } from "../utils/confidenceCopy";
import {
  formatAdultHelpLabel,
  formatEnergyLabel,
  formatEstimatedMinutes,
  formatMessLabel,
} from "../utils/activityFormatters";
import {
  getActivityMissionText,
  getActivityRoleLabel,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";
import { trackProductEvent } from "../utils/analytics";

function MetaChips({ activity }) {
  const chips = [
    formatEstimatedMinutes(activity.estimatedMinutes),
    formatEnergyLabel(activity.energy),
    formatMessLabel(activity.mess),
    formatAdultHelpLabel(activity.adultHelp),
  ].filter(Boolean);

  if (chips.length === 0) return null;

  return (
    <div className="activity-card-meta-chips">
      {chips.map((chip) => (
        <span key={chip} className="activity-card-meta-chip">
          {chip}
        </span>
      ))}
    </div>
  );
}

function CardFeedbackFooter({
  hideFeedbackActions,
  onToggleFeedback,
  onMoreLikeThis,
}) {
  if (hideFeedbackActions) return null;

  return (
    <div className="activity-card-feedback-footer">
      <button type="button" className="text-action" onClick={onToggleFeedback}>
        Not this
      </button>
      <span className="activity-card-feedback-sep" aria-hidden="true">
        ·
      </span>
      <button type="button" className="text-action" onClick={onMoreLikeThis}>
        More like this
      </button>
    </div>
  );
}

function SimpleActivityCard({
  activity,
  isBestFit,
  whyThisFits,
  recommendationReasons,
  fitFacts,
  feedbackIsOpen,
  hideFeedbackActions = false,
  hideDetails = false,
  onStart,
  onDetails,
  onToggleFeedback,
  onMoreLikeThis,
  onTooMessy,
  onTooHard,
  onTooEasy,
  onTooYoung,
  onTooOld,
  onNeedQuieter,
}) {
  return (
    <article className="quest-choice-card activity-card activity-card--simple">
      <div className="quest-choice-main">
        <div className="quest-choice-body">
          {isBestFit ? (
            <div className="quest-card-topline">
              <span className="best-fit-badge">Best fit</span>
            </div>
          ) : null}
          <h3>{activity.title}</h3>
          <MetaChips activity={activity} />
          {activity.summary ? (
            <p className="quest-short-summary">{activity.summary}</p>
          ) : null}
          {whyThisFits ? <p className="why-this-fits">{whyThisFits}</p> : null}
          {recommendationReasons.length > 0 ? (
            <ul className="recommendation-reasons">
              {recommendationReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {fitFacts.length > 0 ? (
            <div className="fit-fact-chip-row">
              {fitFacts.map((fact) => (
                <span key={fact} className="fit-fact-chip">
                  {fact}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="quest-choice-actions">
          <button type="button" className="quest-start-button" onClick={onStart}>
            {activity.isLocked ? "Unlock free" : "Start"}
          </button>
          {!hideDetails ? (
            <button type="button" className="text-action" onClick={onDetails}>
              Details
            </button>
          ) : null}
        </div>

        <CardFeedbackFooter
          hideFeedbackActions={hideFeedbackActions}
          onToggleFeedback={onToggleFeedback}
          onMoreLikeThis={onMoreLikeThis}
        />
      </div>

      {!hideFeedbackActions && feedbackIsOpen ? (
        <div className="not-this-feedback">
          <h4>Why not this one?</h4>
          <div className="feedback-buttons compact-feedback-buttons">
            <button type="button" onClick={onTooMessy}>
              Too messy
            </button>
            <button type="button" onClick={onTooHard}>
              Too hard
            </button>
            <button type="button" onClick={onTooEasy}>
              Too easy
            </button>
            <button type="button" onClick={onTooYoung}>
              Too young
            </button>
            <button type="button" onClick={onTooOld}>
              Too old
            </button>
            <button type="button" onClick={onNeedQuieter}>
              Too loud
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ImaginativeActivityCard({
  activity,
  isBestFit,
  fitFacts,
  feedbackIsOpen,
  hideFeedbackActions = false,
  hideDetails = false,
  onStart,
  onDetails,
  onToggleFeedback,
  onMoreLikeThis,
  onTooMessy,
  onTooHard,
  onTooEasy,
  onTooYoung,
  onTooOld,
  onNeedQuieter,
}) {
  const theme = getVisualThemeMeta(activity.visualTheme);
  const role = getActivityRoleLabel(activity);
  const mission = getActivityMissionText(activity);

  return (
    <article
      className={`quest-choice-card activity-card activity-card--imaginative activity-card--theme-${theme.key}`}
      style={{ "--activity-theme-accent": theme.accent }}
    >
      <div className="activity-card-world-band" aria-hidden="true">
        <span className="activity-card-world-icon">{theme.icon}</span>
        <span className="activity-card-world-label">{theme.label}</span>
      </div>

      <div className="quest-choice-main">
        <div className="quest-choice-body">
          {isBestFit ? (
            <div className="quest-card-topline">
              <span className="best-fit-badge">Best fit</span>
            </div>
          ) : null}

          <h3>{activity.title}</h3>

          {mission ? (
            <p className="activity-card-mission-tease">{mission}</p>
          ) : null}

          {role ? (
            <div className="activity-card-role-badge">
              <span className="activity-card-role-kicker">You are</span>
              <strong>{role}</strong>
            </div>
          ) : null}

          <MetaChips activity={activity} />

          {fitFacts.length > 0 ? (
            <div className="fit-fact-chip-row">
              {fitFacts.map((fact) => (
                <span key={fact} className="fit-fact-chip">
                  {fact}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="quest-choice-actions">
          <button type="button" className="quest-start-button" onClick={onStart}>
            {activity.isLocked ? "Unlock free" : "Start the story"}
          </button>
          {!hideDetails ? (
            <button type="button" className="text-action" onClick={onDetails}>
              Details
            </button>
          ) : null}
        </div>

        <CardFeedbackFooter
          hideFeedbackActions={hideFeedbackActions}
          onToggleFeedback={onToggleFeedback}
          onMoreLikeThis={onMoreLikeThis}
        />
      </div>

      {!hideFeedbackActions && feedbackIsOpen ? (
        <div className="not-this-feedback">
          <h4>Why not this one?</h4>
          <div className="feedback-buttons compact-feedback-buttons">
            <button type="button" onClick={onTooMessy}>
              Too messy
            </button>
            <button type="button" onClick={onTooHard}>
              Too hard
            </button>
            <button type="button" onClick={onTooEasy}>
              Too easy
            </button>
            <button type="button" onClick={onTooYoung}>
              Too young
            </button>
            <button type="button" onClick={onTooOld}>
              Too old
            </button>
            <button type="button" onClick={onNeedQuieter}>
              Too loud
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ActivityResults({
  activities,
  scoredActivities,
  isLoading,
  currentMoment,
  handleStartActivity,
  saveFavoriteActivity,
  handleTooMessy,
  handleTooHard,
  handleTooYoung,
  handleTooOld,
  handleTooEasy,
  handleNeedQuieter,
  handleMoreLikeThis,
  handleTryNextBest,
  activitySessions = [],
  activeChildName = "",
  activeChildId = "",
  inventoryEmpty = false,
  hideFeedbackActions = false,
  hideDetails = false,
  hideSaveFavorite = false,
  detailsStartLabel = null,
  detailsVariant = "full",
  panelTitle = "Pick something to do",
  panelNote = null,
  activityStyle = "",
}) {
  const [detailsActivityTitle, setDetailsActivityTitle] = useState(null);
  const [feedbackActivityTitle, setFeedbackActivityTitle] = useState(null);

  if (isLoading) {
    return (
      <GenerationLoader
        currentMoment={currentMoment}
        activityStyle={activityStyle}
        inventoryEmpty={inventoryEmpty}
      />
    );
  }

  if (activities.length === 0) {
    return null;
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
            <h2>{panelTitle}</h2>
            {panelNote ? <p className="settings-note">{panelNote}</p> : null}
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

            const shared = {
              activity,
              isBestFit,
              whyThisFits,
              recommendationReasons,
              fitFacts,
              feedbackIsOpen,
              hideFeedbackActions,
              hideDetails,
              onStart: () => handleStartActivity(activity),
              onDetails: () => {
                setDetailsActivityTitle(activity.title);
                trackProductEvent("activity_details_opened", {
                  title: activity.title,
                  activityStyle: activity.activityStyle || "",
                });
              },
              onToggleFeedback: () =>
                setFeedbackActivityTitle((current) =>
                  current === activity.title ? null : activity.title
                ),
              onMoreLikeThis: () => handleMoreLikeThis?.(activity),
              onTooMessy: () => handleTooMessy?.(activity),
              onTooHard: () => handleTooHard?.(activity),
              onTooEasy: () => handleTooEasy?.(activity),
              onTooYoung: () => handleTooYoung?.(activity),
              onTooOld: () => handleTooOld?.(activity),
              onNeedQuieter: () => handleNeedQuieter?.(activity),
            };

            return isSimpleActivity ? (
              <SimpleActivityCard key={activity.title} {...shared} />
            ) : (
              <ImaginativeActivityCard key={activity.title} {...shared} />
            );
          })}
        </div>
      </section>

      <ActivityDetailsModal
        activity={detailsEntry?.activity ?? null}
        score={detailsEntry?.score ?? null}
        currentMoment={currentMoment}
        isOpen={Boolean(detailsEntry)}
        onClose={() => setDetailsActivityTitle(null)}
        handleStartActivity={handleStartActivity}
        saveFavoriteActivity={saveFavoriteActivity}
        hideSaveFavorite={hideSaveFavorite}
        variant={detailsVariant}
        whyItFits={
          detailsEntry?.whyItFits ||
          detailsEntry?.activity?.whyItFits ||
          null
        }
        startLabel={
          typeof detailsStartLabel === "function"
            ? detailsStartLabel(detailsEntry?.activity)
            : detailsStartLabel
        }
      />
    </>
  );
}

export default ActivityResults;
