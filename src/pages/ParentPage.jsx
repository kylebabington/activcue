// src/pages/ParentPage.jsx

// Link lets the user move to another page without reloading the app.
import { Link } from "react-router-dom";

// This page is the parent-facing "what is happening right now?" workflow.
// The parent should be able to set the current moment quickly and then send
// the kid to Kid Mode.

function ParentPage({
    parentStatus,
    setParentStatus,
    currentMoment,
    updateCurrentMoment,
    setCurrentMoment,
    defaultParentStatusPresets,
    customParentPresets,
    applyParentStatusPreset,
    getAvailabilityLabel,
    ParentStatusCard,
}) {
    // This function updates both currentMoment and the older parentStatus state.
    //
    // Why both?
    // Because currentMoment is the new better structure,
    // but some older parts of the app still read parentStatus.
    function updateParentActivity(newActivity) {
        updateCurrentMoment("parentActivity", newActivity);

        setParentStatus({
            ...parentStatus,
            activity: newActivity,
        });
    }

    // Same idea here.
    // Availability lives in currentMoment now,
    // but older UI still expects parentStatus.availability.
    function updateAvailability(newAvailability) {
        updateCurrentMoment("availability", newAvailability);

        setParentStatus({
            ...parentStatus,
            availability: newAvailability,
        });
    }

    // This builds a temporary parentStatus-shaped object
    // so the existing ParentStatusCard can keep working.
    const currentMomentStatusCardData = {
        activity: currentMoment.parentActivity,
        availability: currentMoment.availability,
    };

    return (
        <section className="page-layout">
            <section className="hero-card">
                <p className="eyebrow">Parent Now Setup</p>

                <h1>What’s happening right now?</h1>

                <p>
                    Set the current family moment, then let the kid choose a clear next
                    move.
                </p>
            </section>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <h2>Quick status</h2>

                        <p>
                            Choose the closest match. Each button fills in time, space, mess,
                            noise, and interruption expectations.
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

                            <small>
                                {preset.timeNeededMinutes} min · {preset.space}
                            </small>
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
                            This is the real-life situation the app will use when creating
                            quests.
                        </p>
                    </div>
                </div>

                <div className="controls-grid">
                    <label>
                        What are you doing?
                        <input
                            value={currentMoment.parentActivity}
                            onChange={(event) => updateParentActivity(event.target.value)}
                            placeholder="Example: Cooking dinner"
                        />
                    </label>

                    <label>
                        Can kids interrupt?
                        <select
                            value={currentMoment.availability}
                            onChange={(event) => updateAvailability(event.target.value)}
                        >
                            <option value="available">Available</option>
                            <option value="ask-first">Ask first</option>
                            <option value="do-not-interrupt">Do not interrupt</option>
                            <option value="helper-welcome">Helper welcome</option>
                        </select>
                    </label>

                    <label>
                        How much time do you need?
                        <select
                            value={currentMoment.timeNeededMinutes}
                            onChange={(event) =>
                                updateCurrentMoment(
                                    "timeNeededMinutes",
                                    Number(event.target.value)
                                )
                            }
                        >
                            <option value={10}>10 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={20}>20 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                        </select>
                    </label>

                    <label>
                        Where should they play?
                        <select
                            value={currentMoment.space}
                            onChange={(event) =>
                                updateCurrentMoment("space", event.target.value)
                            }
                        >
                            <option value="Living room">Living room</option>
                            <option value="Bedroom">Bedroom</option>
                            <option value="Kitchen table">Kitchen table</option>
                            <option value="Backyard">Backyard</option>
                            <option value="Front yard">Front yard</option>
                            <option value="Garage">Garage</option>
                            <option value="Basement">Basement</option>
                            <option value="Car ride">Car ride</option>
                            <option value="Waiting room">Waiting room</option>
                        </select>
                    </label>

                    <label>
                        Mess level
                        <select
                            value={currentMoment.messLevel}
                            onChange={(event) =>
                                updateCurrentMoment("messLevel", event.target.value)
                            }
                        >
                            <option value="low">Low mess</option>
                            <option value="medium">Medium mess</option>
                            <option value="high">High mess</option>
                        </select>
                    </label>

                    <label>
                        Noise level
                        <select
                            value={currentMoment.noiseLevel}
                            onChange={(event) =>
                                updateCurrentMoment("noiseLevel", event.target.value)
                            }
                        >
                            <option value="quiet">Quiet</option>
                            <option value="normal">Normal</option>
                            <option value="active">Active / loud is okay</option>
                        </select>
                    </label>

                    <label>
                        Supervision level
                        <select
                            value={currentMoment.supervisionLevel}
                            onChange={(event) =>
                                updateCurrentMoment("supervisionLevel", event.target.value)
                            }
                        >
                            <option value="independent">Independent</option>
                            <option value="mostly-independent">Mostly independent</option>
                            <option value="nearby">Adult nearby</option>
                            <option value="helper-welcome">Adult helper welcome</option>
                        </select>
                    </label>
                </div>

                <ParentStatusCard parentStatus={currentMomentStatusCardData} />

                <div className="moment-summary">
                    <h3>Moment summary</h3>

                    <p>
                        The parent is <strong>{currentMoment.parentActivity}</strong>.
                        The child should aim for a{" "}
                        <strong>{currentMoment.messLevel}</strong>-mess,{" "}
                        <strong>{currentMoment.noiseLevel}</strong>-noise activity in the{" "}
                        <strong>{currentMoment.space}</strong> for about{" "}
                        <strong>{currentMoment.timeNeededMinutes} minutes</strong>.
                    </p>
                </div>

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