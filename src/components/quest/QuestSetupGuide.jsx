/** Set Up First — physical prep before Scene 1 (Activity Format V3). */

export default function QuestSetupGuide({
  setupGuide,
  collapsed = false,
  onToggleCollapsed,
  speechRate,
  narration = "",
  SpeechButton,
  showSpeech = true,
}) {
  if (!setupGuide || typeof setupGuide !== "object") return null;

  const needed = Array.isArray(setupGuide.needed)
    ? setupGuide.needed.filter(Boolean)
    : [];
  const steps = Array.isArray(setupGuide.steps)
    ? setupGuide.steps.filter(Boolean)
    : [];
  const readyWhen = String(setupGuide.readyWhen || "").trim();

  if (needed.length === 0 && steps.length === 0 && !readyWhen) {
    return null;
  }

  const body = (
    <>
      {needed.length > 0 ? (
        <div className="quest-setup-section">
          <p className="quest-play-card-kicker">Get these things</p>
          <ul className="quest-setup-needed-list">
            {needed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div className="quest-setup-section">
          <p className="quest-play-card-kicker">Get ready</p>
          <ol className="quest-setup-steps-list">
            {steps.map((step, index) => (
              <li key={`${index}-${step.slice(0, 24)}`}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {readyWhen ? (
        <div className="quest-setup-section quest-setup-section--ready">
          <p className="quest-play-card-kicker">You&apos;re ready when</p>
          <p>{readyWhen}</p>
        </div>
      ) : null}
    </>
  );

  if (collapsed && typeof onToggleCollapsed === "function") {
    return (
      <section className="quest-play-card quest-setup-guide is-collapsed" data-quest-area="setup">
        <button type="button" className="ghost-button" onClick={onToggleCollapsed}>
          Show set up again
        </button>
      </section>
    );
  }

  return (
    <section className="quest-play-card quest-setup-guide" data-quest-area="setup">
      <div className="quest-play-card-header">
        <h2>Set Up First</h2>
        {showSpeech && narration && SpeechButton ? (
          <SpeechButton
            text={narration}
            label="Read setup"
            speechKey="quest-setup"
            rate={speechRate}
            section="setup"
          />
        ) : null}
      </div>
      {body}
      {typeof onToggleCollapsed === "function" ? (
        <button type="button" className="ghost-button quest-setup-collapse" onClick={onToggleCollapsed}>
          Collapse set up
        </button>
      ) : null}
    </section>
  );
}
