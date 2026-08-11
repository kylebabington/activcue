import { useState } from "react";
import {
  formatActivityStyleLabel,
  formatAdultHelpLabel,
  formatEnergyLabel,
  formatEstimatedMinutes,
  formatMessLabel,
} from "../../utils/activityFormatters";
import { getVerifiedFitFacts, buildWhyThisFits } from "../../utils/inventoryFit";
import {
  getActivityMissionText,
  getActivityRoleLabel,
  getStarterIdeas,
  getStepDetails,
  getStepStuckPrompts,
  getVisualThemeMeta,
} from "../../utils/activityVisualTheme";
import { buildNarrationText } from "../../utils/buildNarrationText";
import SpeakButton from "../SpeakButton";
import CollapsibleQuestSection from "./CollapsibleQuestSection";
import { getDefaultOpenSections } from "./questSectionDefaults";

function QuestStepCard({
  step,
  index,
  mode,
  isComplete,
  isCompact,
  isHighlighted,
  instruction,
  isImaginative = false,
  onToggleStep,
  onImStuck,
  speechRate = 0.9,
  stepNarration = "",
}) {
  const examples = Array.isArray(step?.examples) ? step.examples : [];
  const stuckPrompts = getStepStuckPrompts(step);
  const [stuckPromptIndex, setStuckPromptIndex] = useState(-1);
  const visibleStuckPrompt =
    stuckPromptIndex >= 0 ? stuckPrompts[stuckPromptIndex] : "";

  function handleStuckClick() {
    if (stuckPrompts.length === 0) return;
    const nextIndex = (stuckPromptIndex + 1) % stuckPrompts.length;
    setStuckPromptIndex(nextIndex);
    onImStuck?.(index, nextIndex);
  }

  const stepTitle = step?.title || `Step ${index + 1}`;
  const stepPrefix = isImaginative ? `Scene ${index + 1}` : `Step ${index + 1}`;

  return (
    <article
      id={`quest-step-${index}`}
      className={
        [
          "quest-step-card",
          isImaginative ? "quest-step-card--story" : "",
          isComplete ? "is-complete" : "",
          isCompact ? "is-compact" : "",
          isHighlighted ? "is-highlighted" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <div className="quest-step-card-header">
        <h3>
          {stepPrefix}: {stepTitle}
        </h3>
        <div className="quest-step-card-actions">
          {!isCompact && stepNarration ? (
            <SpeakButton
              text={stepNarration}
              label="Read this step"
              speechKey={`quest-step-${index}`}
              rate={speechRate}
              section="step"
            />
          ) : null}
          {mode === "active" ? (
            <label className="quest-step-complete-toggle">
              <input
                type="checkbox"
                checked={Boolean(isComplete)}
                onChange={() => onToggleStep?.(index)}
              />
              {isImaginative ? "Scene complete" : "Done"}
            </label>
          ) : null}
        </div>
      </div>

      {!isCompact ? (
        <>
          <p className={isImaginative ? "quest-step-story-prompt" : undefined}>
            {instruction || step?.instruction}
          </p>

          {examples.length > 0 ? (
            <details className="quest-step-examples">
              <summary>{isImaginative ? "Need a spark?" : "Examples"}</summary>
              <ul>
                {examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {step?.doneWhen ? (
            <p className="step-done-when">
              {isImaginative
                ? "Ready for the next part when: "
                : "Done when: "}
              {step.doneWhen}
            </p>
          ) : null}

          {Array.isArray(step?.roleInstructions) &&
          step.roleInstructions.length > 0 ? (
            <ul className="step-role-instructions">
              {step.roleInstructions.map((entry) => (
                <li key={`${entry.roleName}-${entry.instruction}`}>
                  <strong>{entry.roleName}:</strong> {entry.instruction}
                </li>
              ))}
            </ul>
          ) : null}

          {mode === "active" && stuckPrompts.length > 0 ? (
            <div className="quest-step-stuck-help">
              <button
                type="button"
                className="secondary-action"
                onClick={handleStuckClick}
              >
                I’m stuck
              </button>
              {visibleStuckPrompt ? (
                <div className="quest-v2-if-stuck" aria-live="polite">
                  <p className="quest-step-stuck-counter">
                    Idea {stuckPromptIndex + 1} of {stuckPrompts.length}
                  </p>
                  <p>{visibleStuckPrompt}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function resolveStepInstruction(step, selectedRoleName, roleAssignments) {
  if (!step) return "";
  const roleInstructions = Array.isArray(step.roleInstructions)
    ? step.roleInstructions
    : [];
  const assignedRoles = Object.values(roleAssignments || {}).filter(Boolean);
  const preferredRoles = [selectedRoleName, ...assignedRoles].filter(Boolean);

  for (const roleName of preferredRoles) {
    const match = roleInstructions.find(
      (entry) =>
        entry?.roleName &&
        entry.roleName.toLowerCase() === String(roleName).toLowerCase()
    );
    if (match?.instruction) return match.instruction;
  }
  return step.instruction || "";
}

/**
 * Shared Activity V2 renderer for preview (details) and active quest.
 */
export default function QuestContent({
  activity,
  mode = "preview",
  score,
  currentMoment,
  openSections,
  onSectionOpenChange,
  completedStepIndexes = [],
  checkedStarterIndexes = [],
  onToggleStep,
  onToggleStarter,
  onImStuck,
  highlightedStuckStepIndex = null,
  focusStepIndex = null,
  playingChildren = [],
  roleAssignments = {},
  onAssignRole,
  selectedRoleName = "",
  extensionIdeas = [],
  onFinish,
  timerSecondsRemaining,
  formatTimer,
  timerDone = false,
  onTimerFinished,
  onTimerNotFinished,
  onTimerNeedAnotherIdea,
  onTimerMoreLikeThis,
  speechRate = 0.9,
}) {
  if (!activity) return null;

  const isSimpleActivity = activity.activityStyle === "simple";
  const isImaginativeActivity = !isSimpleActivity;
  const steps = getStepDetails(activity);
  const uses = Array.isArray(activity.uses) ? activity.uses : [];
  const roles = Array.isArray(activity.roles) ? activity.roles : [];
  const starterIdeas = getStarterIdeas(activity);
  const extensions = Array.isArray(extensionIdeas)
    ? extensionIdeas
    : Array.isArray(activity.extensionIdeas)
      ? activity.extensionIdeas
      : [];
  const fitFacts =
    mode === "preview" ? getVerifiedFitFacts(activity, currentMoment) : [];
  const whyThisFits =
    mode === "preview" ? buildWhyThisFits(activity, currentMoment) : "";
  const theme = getVisualThemeMeta(activity.visualTheme);
  const roleGuide = activity.roleGuide;
  const childRoles = Array.isArray(roleGuide?.childRoles)
    ? roleGuide.childRoles
    : [];
  const roleName = getActivityRoleLabel(activity);
  const mission = getActivityMissionText(activity);
  const sections = openSections || getDefaultOpenSections();
  const multiChild = playingChildren.length > 1 && roles.length > 1;
  const missionNarration = buildNarrationText(activity, "mission", {
    selectedRoleName: selectedRoleName || roleName,
    roleAssignments,
  });
  const startersNarration = buildNarrationText(activity, "starters");
  const resolvedSpeechRate =
    Number(activity?.readingMode?.speechRate) || speechRate;

  function sectionProps(key, title, summary, defaultOpen) {
    const controlled = Boolean(onSectionOpenChange);
    return {
      id: `quest-section-${key}`,
      title,
      summary,
      open: controlled ? Boolean(sections[key]) : undefined,
      defaultOpen: controlled ? undefined : defaultOpen,
      onOpenChange: controlled
        ? (nextOpen) => onSectionOpenChange(key, nextOpen)
        : undefined,
    };
  }

  return (
    <div
      className={
        mode === "active"
          ? "quest-content quest-content--active"
          : "quest-content quest-content--preview"
      }
    >
      {mode === "preview" ? (
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
      ) : (
        <p className="simple-active-eyebrow">
          {theme.icon} {theme.label}
        </p>
      )}

      {mode === "preview" && !isSimpleActivity && activity.theme ? (
        <p className="activity-theme">{activity.theme}</p>
      ) : null}

      {mode === "preview" && activity.summary ? (
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

      <CollapsibleQuestSection
        {...sectionProps(
          "mission",
          isImaginativeActivity ? "The Story" : "Overview",
          formatEstimatedMinutes(activity.estimatedMinutes) || undefined,
          true
        )}
      >
        <div className="activity-meta compact-meta activity-details-meta">
          {formatEstimatedMinutes(activity.estimatedMinutes) ? (
            <span>{formatEstimatedMinutes(activity.estimatedMinutes)}</span>
          ) : null}
          <span>
            {steps.length} {isImaginativeActivity ? "scenes" : "steps"}
          </span>
          {formatActivityStyleLabel(activity.activityStyle) ? (
            <span>{formatActivityStyleLabel(activity.activityStyle)}</span>
          ) : null}
          {formatMessLabel(activity.mess) ? (
            <span>{formatMessLabel(activity.mess)}</span>
          ) : null}
          {formatEnergyLabel(activity.energy) ? (
            <span>{formatEnergyLabel(activity.energy)}</span>
          ) : null}
          {formatAdultHelpLabel(activity.adultHelp) ? (
            <span>{formatAdultHelpLabel(activity.adultHelp)}</span>
          ) : null}
        </div>

        {missionNarration ? (
          <div className="quest-section-speak-row">
            <SpeakButton
              text={missionNarration}
              label="Read"
              speechKey="quest-mission"
              rate={resolvedSpeechRate}
              section="mission"
            />
          </div>
        ) : null}

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
        ) : (
          <p>{mission || activity.summary}</p>
        )}

        {activity.ageFit?.ageFitReason ? (
          <p className="quest-age-fit-reason">{activity.ageFit.ageFitReason}</p>
        ) : null}
      </CollapsibleQuestSection>

      <CollapsibleQuestSection
        {...sectionProps("role", "Your Role", roleName || undefined, true)}
      >
        {missionNarration ? (
          <div className="quest-section-speak-row">
            <SpeakButton
              text={missionNarration}
              label="Read"
              speechKey="quest-role"
              rate={resolvedSpeechRate}
              section="mission"
            />
          </div>
        ) : null}
        {childRoles.length > 0 ? (
          <ul className="quest-child-roles">
            {childRoles.map((role) => (
              <li key={`${role.childName}-${role.roleTitle}`}>
                <strong>
                  {role.childName}
                  {role.age ? ` (${role.age})` : ""}: {role.roleTitle}
                </strong>
                <p>{role.responsibility}</p>
                {role.firstAction ? (
                  <p>
                    <em>{isImaginativeActivity ? "First move:" : "Start with:"}</em>{" "}
                    {role.firstAction}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <>
            {roleName ? (
              <p>
                <strong>{roleName}</strong>
              </p>
            ) : null}
            {roleGuide?.description ? <p>{roleGuide.description}</p> : null}
            {roleGuide?.goal ? (
              <p>
                <em>{isImaginativeActivity ? "Your mission:" : "Your job:"}</em>{" "}
                {roleGuide.goal}
              </p>
            ) : null}
            {roleGuide?.firstAction ? (
              <p>
                <em>{isImaginativeActivity ? "First move:" : "Start with:"}</em>{" "}
                {roleGuide.firstAction}
              </p>
            ) : null}
          </>
        )}

        {mode === "active" && multiChild ? (
          <div className="quest-v2-role-picker">
            <h3>Pick roles for everyone</h3>
            {playingChildren.map((child) => (
              <label key={child.id} className="quest-v2-role-row">
                <span>{child.name || "Player"}</span>
                <select
                  value={roleAssignments?.[child.id] || roles[0] || ""}
                  onChange={(event) =>
                    onAssignRole?.(child.id, event.target.value)
                  }
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}

        {mode === "preview" && roles.length > 1 ? (
          <ul>
            {roles.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        ) : null}
      </CollapsibleQuestSection>

      {starterIdeas.length > 0 ? (
        <CollapsibleQuestSection
          {...sectionProps(
            "starters",
            isImaginativeActivity ? "Story Starters" : "Starter Ideas",
            `${starterIdeas.length} ideas`,
            true
          )}
        >
          {startersNarration ? (
            <div className="quest-section-speak-row">
              <SpeakButton
                text={startersNarration}
                label="Read starters"
                speechKey="quest-starters"
                rate={resolvedSpeechRate}
                section="starter"
              />
            </div>
          ) : null}
          <div className="quest-v2-starter-doors">
            {starterIdeas.map((idea, index) => {
              const checked = checkedStarterIndexes.includes(index);
              if (mode === "active") {
                return (
                  <button
                    key={`${idea.title}-${index}`}
                    type="button"
                    className={
                      checked
                        ? "quest-v2-starter-door is-open"
                        : "quest-v2-starter-door"
                    }
                    onClick={() => onToggleStarter?.(index)}
                  >
                    <span className="quest-v2-starter-title">{idea.title}</span>
                    {idea.example ? (
                      <span className="quest-v2-starter-example">
                        {idea.example}
                      </span>
                    ) : null}
                    {idea.kind ? (
                      <span className="quest-v2-starter-kind">{idea.kind}</span>
                    ) : null}
                  </button>
                );
              }

              return (
                <div key={`${idea.title}-${index}`} className="quest-v2-starter-door">
                  <span className="quest-v2-starter-title">{idea.title}</span>
                  {idea.example ? (
                    <span className="quest-v2-starter-example">{idea.example}</span>
                  ) : null}
                  {idea.kind ? (
                    <span className="quest-v2-starter-kind">{idea.kind}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CollapsibleQuestSection>
      ) : null}

      <CollapsibleQuestSection
        {...sectionProps(
          "materials",
          isImaginativeActivity ? "Props & Supplies" : "What You Need",
          uses.length > 0 ? `${uses.length} items` : "No special materials",
          false
        )}
      >
        {uses.length > 0 ? (
          <ul>
            {uses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>Use whatever you already have nearby.</p>
        )}
      </CollapsibleQuestSection>

      <CollapsibleQuestSection
        {...sectionProps(
          "steps",
          isImaginativeActivity ? "Story Path" : "Steps",
          `${steps.length} ${isImaginativeActivity ? "scenes" : "steps"}`,
          true
        )}
      >
        {steps.length === 0 ? (
          <p>No steps listed.</p>
        ) : (
          <div className="quest-steps-list">
            {steps.map((step, index) => {
              const isComplete = completedStepIndexes.includes(index);
              const isFocus =
                focusStepIndex === index ||
                (focusStepIndex == null &&
                  mode === "active" &&
                  !isComplete &&
                  completedStepIndexes.every((done) => done < index) &&
                  !completedStepIndexes.includes(index) &&
                  index ===
                    steps.findIndex((_, i) => !completedStepIndexes.includes(i)));
              return (
                <QuestStepCard
                  key={`${step.title}-${index}`}
                  step={step}
                  index={index}
                  mode={mode}
                  isComplete={isComplete}
                  isCompact={mode === "active" && isComplete && !isFocus}
                  isHighlighted={highlightedStuckStepIndex === index}
                  instruction={resolveStepInstruction(
                    step,
                    selectedRoleName || roleName,
                    roleAssignments
                  )}
                  isImaginative={isImaginativeActivity}
                  onToggleStep={onToggleStep}
                  onImStuck={onImStuck}
                  speechRate={resolvedSpeechRate}
                  stepNarration={buildNarrationText(activity, "step", {
                    stepIndex: index,
                    selectedRoleName: selectedRoleName || roleName,
                    roleAssignments,
                  })}
                />
              );
            })}
          </div>
        )}
      </CollapsibleQuestSection>

      <CollapsibleQuestSection
        {...sectionProps(
          "finish",
          isImaginativeActivity ? "The Big Finish" : "Finish the Activity",
          undefined,
          false
        )}
      >
        {extensions.length > 0 ? (
          <>
            <h3>{isImaginativeActivity ? "Want one more twist?" : "Keep going"}</h3>
            <ul>
              {extensions.map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>
          </>
        ) : null}

        {mode === "preview" && activity.whyItFits ? (
          <div className="why-it-fits-box">
            <h3>Why this might fit</h3>
            {typeof score === "number" ? (
              <p className="fit-score-note">
                Fit score {score} against the current family moment.
              </p>
            ) : null}
            <p>{activity.whyItFits}</p>
          </div>
        ) : null}

        {mode === "active" ? (
          <>
            {typeof timerSecondsRemaining === "number" && formatTimer ? (
              <div
                className={timerDone ? "timer-badge done" : "timer-badge"}
                aria-live="polite"
              >
                <span className="timer-label">
                  {timerDone ? "Timer" : "Time left"}
                </span>
                <span className="timer-value">
                  {timerDone ? "Done!" : formatTimer(timerSecondsRemaining)}
                </span>
              </div>
            ) : null}

            <div className="quest-finish-actions">
              <button type="button" onClick={onFinish}>
                {isImaginativeActivity ? "Finish the story" : "Mark complete"}
              </button>
              {timerDone ? (
                <>
                  <button type="button" onClick={onTimerFinished || onFinish}>
                    Yes, finished
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={onTimerNotFinished}
                  >
                    Not really
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={onTimerNeedAnotherIdea}
                  >
                    Need another idea
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={onTimerMoreLikeThis}
                  >
                    More like this
                  </button>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </CollapsibleQuestSection>
    </div>
  );
}

export { QuestStepCard };