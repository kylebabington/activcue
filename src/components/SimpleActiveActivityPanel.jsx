// src/components/SimpleActiveActivityPanel.jsx

function SimpleActiveActivityPanel({
    activeActivity,
    stepHint,
    handleNeedStepHint,
    finishActiveActivity,
    cancelActiveActivity,
}) {
    // Keep these safe.
    // If the AI ever forgets an array, the UI still works.
    const steps = Array.isArray(activeActivity?.steps)
        ? activeActivity.steps
        : [];

    const uses = Array.isArray(activeActivity?.uses)
        ? activeActivity.uses
        : [];

    return (
        <section className="simple-active-panel">
            <p className="simple-active-eyebrow">Simple activity</p>

            <h1 className="simple-active-title">{activeActivity.title}</h1>

            {activeActivity.summary && (
                <p className="simple-active-summary">{activeActivity.summary}</p>
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
                <button type="button" onClick={handleNeedStepHint}>
                    Need a hint
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