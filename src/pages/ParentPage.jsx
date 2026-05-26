// src/pages/ParentPage.jsx

// Link lets the user move to another page without reloading the app.
import { Link } from "react-router-dom";

// This page is the parent-facing "what is happening right now?" workflow.
// The parent should be able to set the current moment quickly and then send
// the kid to Kid Mode.

function ParentPage({
    parentStatus,
    setParentStatus,
    defaultParentStatusPresets,
    customParentPresets,
    applyParentStatusPreset,
    getAvailabilityLabel,
    ParentStatusCard,
}) {
    return (
        <section className="page-layout">
            <section className="hero-card">
                <p className="eyebrow">Parent Now Setup</p>

                <h1>What’s happening right now?</h1>

                <p>
                    Set the current adult task, then let the kid choose a clear next move.
                </p>
            </section>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <h2>Quick status</h2>
                        <p>
                            Choose the closest match. This makes adult work visible without
                            building a full schedule.
                        </p>
                    </div>
                </div>

                <div className="preset-grid">
                    {defaultParentStatusPresets.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyParentStatusPreset(preset)}
                        >
                            <span>{preset.label}</span>
                            <small>{getAvailabilityLabel(preset.availability)}</small>
                        </button>
                    ))}
                </div>

                {customParentPresets.length > 0 && (
                    <>
                        <h3>Custom status</h3>

                        <div className="preset-grid">
                            {customParentPresets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => applyParentStatusPreset(preset)}
                                >
                                    <span>{preset.label}</span>
                                    <small>{getAvailabilityLabel(preset.availability)}</small>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <h2>Current moment</h2>
                        <p>
                            This is what the kid sees before picking an activity.
                        </p>
                    </div>
                </div>

                <label>
                    What are you doing?
                    <input
                        value={parentStatus.activity}
                        onChange={(event) =>
                            setParentStatus({
                                ...parentStatus,
                                activity: event.target.value,
                            })
                        }
                    />
                </label>

                <label>
                    Can kids interrupt?
                    <select
                        value={parentStatus.availability}
                        onChange={(event) =>
                            setParentStatus({
                                ...parentStatus,
                                availability: event.target.value,
                            })
                        }
                    >
                        <option value="available">Available</option>
                        <option value="ask-first">Ask first</option>
                        <option value="do-not-interrupt">Do not interrupt</option>
                        <option value="helper-welcome">Helper welcome</option>
                    </select>
                </label>

                <ParentStatusCard parentStatus={parentStatus} />

                <div className="page-actions">
                    <Link className="primary-link-button" to="/kid">
                        Start Kid Mode
                    </Link>

                    <Link className="ghost-link-button" to="/settings">
                        Edit settings
                    </Link>
                </div>
            </section>
        </section>
    );
}

export default ParentPage;