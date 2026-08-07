// src/components/ActivityDetailsModal.jsx

import QuestContent from "./quest/QuestContent";
import Modal from "./Modal";
import {
  formatActivityStyleLabel,
  formatAdultHelpLabel,
  formatEnergyLabel,
  formatEstimatedMinutes,
  formatMessLabel,
} from "../utils/activityFormatters";
import { buildWhyThisFits, getVerifiedFitFacts } from "../utils/inventoryFit";
import {
  getActivityMissionText,
  getActivityRoleLabel,
  getStepDetails,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";

function ActivityDetailsContent({ activity, score, currentMoment }) {
  return (
    <div className="activity-details-content">
      <QuestContent
        activity={activity}
        mode="preview"
        score={score}
        currentMoment={currentMoment}
      />
    </div>
  );
}

/**
 * Marketing / demo teaser — enough to entice, no playbook (steps, starters, materials).
 */
function ActivityTeaserContent({ activity, score, currentMoment, whyItFits }) {
  const theme = getVisualThemeMeta(activity.visualTheme);
  const isImaginative = activity.activityStyle === "imaginative";
  const role = getActivityRoleLabel(activity);
  const mission = getActivityMissionText(activity);
  const description = activity.summary || mission || "";
  const fitText =
    whyItFits ||
    buildWhyThisFits(activity, currentMoment) ||
    activity.whyItFits ||
    "";
  const fitFacts = getVerifiedFitFacts(activity, currentMoment);
  const stepCount = getStepDetails(activity).length;
  const metaChips = [
    formatEstimatedMinutes(activity.estimatedMinutes),
    formatEnergyLabel(activity.energy),
    formatMessLabel(activity.mess),
    formatAdultHelpLabel(activity.adultHelp),
  ].filter(Boolean);

  return (
    <div className="activity-details-content activity-teaser-content">
      <div className="quest-card-topline">
        <span
          className={
            isImaginative
              ? "activity-style-badge pretend-style-badge"
              : "activity-style-badge simple-style-badge"
          }
        >
          {formatActivityStyleLabel(activity.activityStyle)}
        </span>
        {isImaginative ? (
          <span className="activity-visual-theme-badge">
            {theme.icon} {theme.label}
          </span>
        ) : null}
      </div>

      {isImaginative && activity.theme ? (
        <p className="activity-theme">{activity.theme}</p>
      ) : null}

      {description ? <p className="quest-short-summary">{description}</p> : null}

      {isImaginative && role ? (
        <div className="activity-card-role-badge">
          <span className="activity-card-role-kicker">You are</span>
          <strong>{role}</strong>
        </div>
      ) : null}

      {metaChips.length > 0 ? (
        <div className="activity-card-meta-chips">
          {metaChips.map((chip) => (
            <span key={chip} className="activity-card-meta-chip">
              {chip}
            </span>
          ))}
        </div>
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

      {fitText ? (
        <div className="why-it-fits-box">
          <h3>Why this might fit</h3>
          {typeof score === "number" ? (
            <p className="fit-score-note">
              Fit score {Math.round(score)} against the current moment.
            </p>
          ) : null}
          <p>{fitText}</p>
        </div>
      ) : null}

      <div className="activity-teaser-lockout" role="note">
        <p>
          {stepCount > 0
            ? `Includes ${stepCount} guided ${
                isImaginative ? "scenes" : "steps"
              } — unlock to see them and start playing.`
            : "Create a free account to unlock the full activity and start playing."}
        </p>
      </div>
    </div>
  );
}

function ActivityDetailsModal({
  activity,
  score,
  currentMoment,
  isOpen,
  onClose,
  handleStartActivity,
  saveFavoriteActivity,
  startLabel = null,
  hideSaveFavorite = false,
  variant = "full",
  whyItFits = null,
}) {
  if (!activity) {
    return null;
  }

  function handleStart() {
    handleStartActivity(activity);
    onClose();
  }

  const isTeaser = variant === "teaser";

  const resolvedStartLabel =
    startLabel ||
    (activity.activityStyle === "imaginative"
      ? "Enter the story"
      : "Start this activity");

  const footer = (
    <>
      <button type="button" className="ghost-button" onClick={onClose}>
        Close
      </button>

      {!hideSaveFavorite && typeof saveFavoriteActivity === "function" ? (
        <button
          type="button"
          className="secondary-action"
          onClick={() => saveFavoriteActivity(activity)}
        >
          Save favorite
        </button>
      ) : null}

      <button type="button" onClick={handleStart}>
        {resolvedStartLabel}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activity.title}
      footer={footer}
      fullPage={!isTeaser}
    >
      {isTeaser ? (
        <ActivityTeaserContent
          activity={activity}
          score={score}
          currentMoment={currentMoment}
          whyItFits={whyItFits}
        />
      ) : (
        <ActivityDetailsContent
          activity={activity}
          score={score}
          currentMoment={currentMoment}
        />
      )}
    </Modal>
  );
}

export {
  ActivityDetailsModal,
  ActivityDetailsContent,
  ActivityTeaserContent,
};
export default ActivityDetailsModal;
