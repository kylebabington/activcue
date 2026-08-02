import {
  formatActivityStyleLabel,
  formatAdultHelpLabel,
  formatEnergyLabel,
  formatEstimatedMinutes,
  formatMessLabel,
} from "../utils/activityFormatters";
import { getVerifiedFitFacts, buildWhyThisFits } from "../utils/inventoryFit";
import Modal from "./Modal";

function ActivityDetailsContent({ activity, score, currentMoment }) {
  const isSimpleActivity = activity.activityStyle === "simple";
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
  const fitFacts = getVerifiedFitFacts(activity, currentMoment);
  const whyThisFits = buildWhyThisFits(activity, currentMoment);

  return (
    <div className="activity-details-content">
      <div className="quest-card-topline">
        <span
          className={
            isSimpleActivity
              ? "activity-style-badge simple-style-badge"
              : "activity-style-badge pretend-style-badge"
          }
        >
          {formatActivityStyleLabel(activity.activityStyle)}
        </span>
      </div>

      {!isSimpleActivity && activity.theme && (
        <p className="activity-theme">{activity.theme}</p>
      )}

      {activity.summary && (
        <p className="quest-short-summary">{activity.summary}</p>
      )}

      {whyThisFits ? <p className="why-this-fits">{whyThisFits}</p> : null}

      {fitFacts.length > 0 && (
        <div className="fit-fact-chip-row">
          {fitFacts.map((fact) => (
            <span key={fact} className="fit-fact-chip">
              {fact}
            </span>
          ))}
        </div>
      )}

      <div className="activity-meta compact-meta activity-details-meta">
        {formatEstimatedMinutes(activity.estimatedMinutes) && (
          <span>{formatEstimatedMinutes(activity.estimatedMinutes)}</span>
        )}
        <span>{steps.length} steps</span>
        {formatMessLabel(activity.mess) && (
          <span>{formatMessLabel(activity.mess)}</span>
        )}
        {formatEnergyLabel(activity.energy) && (
          <span>{formatEnergyLabel(activity.energy)}</span>
        )}
        {formatAdultHelpLabel(activity.adultHelp) && (
          <span>{formatAdultHelpLabel(activity.adultHelp)}</span>
        )}
        {uses.length > 0 && (
          <span>Uses: {uses.slice(0, 4).join(", ")}</span>
        )}
      </div>

      {!isSimpleActivity && activity.kidRole && (
        <div className="quest-box role-box">
          <h4>Your role</h4>
          <p>{activity.kidRole}</p>
        </div>
      )}

      {!isSimpleActivity && activity.mission && (
        <div className="quest-box mission-box">
          <h4>Your story</h4>
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
          <h4>Steps</h4>
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
          <h4>Why this might fit</h4>
          {typeof score === "number" && (
            <p className="fit-score-note">
              Fit score {score} against the current family moment.
            </p>
          )}
          <p>{activity.whyItFits}</p>
        </div>
      )}
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
}) {
  if (!activity) {
    return null;
  }

  function handleStart() {
    handleStartActivity(activity);
    onClose();
  }

  const footer = (
    <>
      <button type="button" className="ghost-button" onClick={onClose}>
        Close
      </button>

      <button
        type="button"
        className="secondary-action"
        onClick={() => saveFavoriteActivity(activity)}
      >
        Save favorite
      </button>

      <button type="button" onClick={handleStart}>
        Start this activity
      </button>
    </>
  );

  return (
    <Modal
      title={activity.title}
      isOpen={isOpen}
      onClose={onClose}
      footer={footer}
      fullPage
    >
      <ActivityDetailsContent
        activity={activity}
        score={score}
        currentMoment={currentMoment}
      />
    </Modal>
  );
}

export { ActivityDetailsContent, ActivityDetailsModal };
