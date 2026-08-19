import SpeakButton from "../SpeakButton";
import QuestSetupGuide from "./QuestSetupGuide";
import { buildNarrationText } from "../../utils/buildNarrationText";
import { getActivityStoryText } from "../../utils/activityVisualTheme";

/** Full-screen setup step before the timer starts (Activity Format V3). */

export default function QuestSetupScreen({
  activity,
  onCompleteSetup,
  onCancel,
  speechRate = 0.9,
}) {
  const storyText = getActivityStoryText(activity);
  const setupNarration = buildNarrationText(activity, "setup");

  return (
    <section className="quest-setup-screen panel" aria-labelledby="quest-setup-title">
      <header className="quest-setup-screen-header">
        <h2 id="quest-setup-title">Set Up First</h2>
        <p className="quest-setup-screen-lead">
          Get everything ready before Scene 1. The timer starts after you press Ready.
        </p>
      </header>

      {storyText ? (
        <div className="quest-setup-screen-story">
          <p className="quest-play-card-kicker">The Story</p>
          <p>{storyText}</p>
        </div>
      ) : null}

      <QuestSetupGuide
        setupGuide={activity.setupGuide}
        narration={setupNarration}
        speechRate={speechRate}
        SpeechButton={SpeakButton}
      />

      <div className="quest-setup-screen-actions">
        <button type="button" className="listening-mode-primary" onClick={onCompleteSetup}>
          Ready!
        </button>
        {onCancel ? (
          <button type="button" className="secondary-action" onClick={onCancel}>
            Back
          </button>
        ) : null}
      </div>
    </section>
  );
}
