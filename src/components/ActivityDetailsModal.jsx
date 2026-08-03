import {
  formatActivityStyleLabel,
  formatAdultHelpLabel,
  formatEnergyLabel,
  formatEstimatedMinutes,
  formatMessLabel,
} from "../utils/activityFormatters";
import { getVerifiedFitFacts, buildWhyThisFits } from "../utils/inventoryFit";
import {
  getActivityMissionText,
  getActivityRoleLabel,
  getStarterIdeas,
  getStepDetails,
  getVisualThemeMeta,
} from "../utils/activityVisualTheme";
import Modal from "./Modal";

function ActivityDetailsContent({ activity, score, currentMoment }) {
  const isSimpleActivity = activity.activityStyle === "simple";
  const steps = getStepDetails(activity);
  const uses = Array.isArray(activity.uses) ? activity.uses : [];
  const roles = Array.isArray(activity.roles) ? activity.roles : [];
  const starterIdeas = getStarterIdeas(activity);
  const extensionIdeas = Array.isArray(activity.extensionIdeas)
    ? activity.extensionIdeas
    : [];
  const fitFacts = getVerifiedFitFacts(activity, currentMoment);
  const whyThisFits = buildWhyThisFits(activity, currentMoment);
  const theme = getVisualThemeMeta(activity.visualTheme);
  const roleGuide = activity.roleGuide;
  const roleName = getActivityRoleLabel(activity);
  const mission = getActivityMissionText(activity);

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
        {!isSimpleActivity ? (
          <span className="activity-visual-theme-badge">
            {theme.icon} {theme.label}
          </span>
        ) : null}
      </div>

      {!isSimpleActivity && activity.theme ? (
        <p className="activity-theme">{activity.theme}</p>
      ) : null}

      {activity.summary ? (
        <p className="quest-short-summary">{activity.summary}</p>
      ) : null}

      {whyThisFits ? <p className="why-this-fits">{whyThisFits}</p> : null}

      {fitFacts.length > 0 ? (
        <div className="fit-fact-chip-row">
          {fitFacts.map((fact) => (
            <span key={fact} className="fit-fact-chip">
              {fact}
            </span>
          ))}
        </div>
      ) : null}

      <div className="activity-meta compact-meta activity-details-meta">
        {formatEstimatedMinutes(activity.estimatedMinutes) ? (
          <span>{formatEstimatedMinutes(activity.estimatedMinutes)}</span>
        ) : null}
        <span>{steps.length} steps</span>
        {formatMessLabel(activity.mess) ? (
          <span>{formatMessLabel(activity.mess)}</span>
        ) : null}
        {formatEnergyLabel(activity.energy) ? (
          <span>{formatEnergyLabel(activity.energy)}</span>
        ) : null}
        {formatAdultHelpLabel(activity.adultHelp) ? (
          <span>{formatAdultHelpLabel(activity.adultHelp)}</span>
        ) : null}
        {uses.length > 0 ? (
          <span>Uses: {uses.slice(0, 4).join(", ")}</span>
        ) : null}
      </div>

      {!isSimpleActivity ? (
        <div
          className={`activity-details-world-band activity-card--theme-${theme.key}`}
          style={{ "--activity-theme-accent": theme.accent }}
        >
          <span aria-hidden="true">{theme.icon}</span>
          <div>
            <p className="activity-details-world-kicker">The world</p>
            <p>{mission || activity.theme || theme.label}</p>
          </div>
        </div>
      ) : null}

      {!isSimpleActivity ? (
        <div className="quest-box role-box">
          <h4>Your role</h4>
          <p>
            <strong>{roleName}</strong>
          </p>
          {roleGuide?.description ? <p>{roleGuide.description}</p> : null}
          {roleGuide?.goal ? (
            <p>
              <em>Your job:</em> {roleGuide.goal}
            </p>
          ) : null}
          {roleGuide?.firstAction ? (
            <p>
              <em>Start with:</em> {roleGuide.firstAction}
            </p>
          ) : null}
        </div>
      ) : null}

      {!isSimpleActivity && starterIdeas.length > 0 ? (
        <div className="quest-box prompt-box">
          <h4>Starter ideas</h4>
          <ul className="starter-ideas-list">
            {starterIdeas.map((idea) => (
              <li key={`${idea.title}-${idea.example}`}>
                <strong>{idea.title}</strong>
                {idea.example && idea.example !== idea.title ? (
                  <span> — {idea.example}</span>
                ) : null}
                {idea.kind ? (
                  <span className="starter-idea-kind">{idea.kind}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isSimpleActivity && roles.length > 1 ? (
        <div className="quest-box roles-box">
          <h4>Roles</h4>
          <ul>
            {roles.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div className="quest-box">
          <h4>Steps</h4>
          <ol className="step-details-list">
            {steps.map((step, index) => (
              <li key={`${step.title}-${index}`}>
                <strong>{step.title}</strong>
                <p>{step.instruction}</p>
                {step.examples?.length > 0 ? (
                  <ul>
                    {step.examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                ) : null}
                {step.doneWhen ? (
                  <p className="step-done-when">
                    Done when: {step.doneWhen}
                  </p>
                ) : null}
                {step.ifStuck ? (
                  <p className="step-if-stuck">If stuck: {step.ifStuck}</p>
                ) : null}
                {Array.isArray(step.roleInstructions) &&
                step.roleInstructions.length > 0 ? (
                  <ul className="step-role-instructions">
                    {step.roleInstructions.map((entry) => (
                      <li key={`${entry.roleName}-${entry.instruction}`}>
                        <strong>{entry.roleName}:</strong> {entry.instruction}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {!isSimpleActivity && extensionIdeas.length > 0 ? (
        <div className="quest-box extension-box">
          <h4>Keep going</h4>
          <ul>
            {extensionIdeas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {activity.whyItFits ? (
        <div className="quest-box why-it-fits-box">
          <h4>Why this might fit</h4>
          {typeof score === "number" ? (
            <p className="fit-score-note">
              Fit score {score} against the current family moment.
            </p>
          ) : null}
          <p>{activity.whyItFits}</p>
        </div>
      ) : null}
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
        {activity.activityStyle === "imaginative"
          ? "Enter the story"
          : "Start this activity"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activity.title}
      footer={footer}
    >
      <ActivityDetailsContent
        activity={activity}
        score={score}
        currentMoment={currentMoment}
      />
    </Modal>
  );
}

export { ActivityDetailsModal, ActivityDetailsContent };
export default ActivityDetailsModal;
