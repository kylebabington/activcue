// src/components/SimpleActiveActivityPanel.jsx

import { getVerifiedFitFacts, buildWhyThisFits } from "../utils/inventoryFit";

function SimpleActiveActivityPanel({
  activeActivity,
  currentMoment,
  stepHint,
  isHintLoading,
  handleNeedStepHint,
  canUseAiHints = true,
  finishActiveActivity,
  cancelActiveActivity,
}) {
  const steps = Array.isArray(activeActivity?.steps)
    ? activeActivity.steps
    : [];

  const uses = Array.isArray(activeActivity?.uses) ? activeActivity.uses : [];
  const fitFacts = getVerifiedFitFacts(activeActivity, currentMoment);
  const whyThisFits = buildWhyThisFits(activeActivity, currentMoment);

  return (
    <section className="simple-active-panel" id="active-activity-panel">
      <p className="simple-active-eyebrow">Simple activity</p>

      <h1 className="simple-active-title">{activeActivity.title}</h1>

      {activeActivity.summary && (
        <p className="simple-active-summary">{activeActivity.summary}</p>
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

      {uses.length > 0 && (
        <div className="simple-active-section">
          <h2>Use this</h2>

          <div className="simple-active-chip-row">
            {uses.map((item, index) => (
              <span className="simple-active-chip" key={`${item}-${index}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="simple-active-section">
          <h2>Do this</h2>

          <ol className="simple-active-steps">
            {steps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {stepHint && (
        <div className="simple-active-hint">
          <h2>Hint</h2>
          <p>{stepHint}</p>
        </div>
      )}

      <div className="simple-active-actions">
        <button
          type="button"
          className={canUseAiHints ? undefined : "hint-button--plus"}
          onClick={handleNeedStepHint}
          disabled={isHintLoading || !canUseAiHints}
          title={
            canUseAiHints
              ? undefined
              : "AI hints are included with ActivCue Plus"
          }
        >
          {isHintLoading
            ? "Thinking..."
            : canUseAiHints
              ? "Need a hint"
              : "Plus hint"}
        </button>

        <button type="button" onClick={finishActiveActivity}>
          Done
        </button>

        <button type="button" onClick={cancelActiveActivity}>
          Stop
        </button>
      </div>
    </section>
  );
}

export default SimpleActiveActivityPanel;
