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
    applyCurrentMomentQuickAdjust,
    defaultParentStatusPresets,
    customParentPresets,
    applyParentStatusPreset,
    getAvailabilityLabel,
    ParentStatusCard,
}) {

    function getMomentValue(fieldName, fallbackText = "Not set") {
        return currentMoment?.[fieldName] || fallbackText;
    }

    function quickChipClass(fieldName, expectedValue) {
        const isActive = currentMoment?.[fieldName] === expectedValue;

        return isActive ? "quick-chip active" : "quick-chip";
    }

    function applyMomentChip(adjustment) {
        applyCurrentMomentQuickAdjust(adjustment);
    }

    function quickAdjustButtonClass(fieldName, expectedValue) {
        // Check whether a currentMoment field matches this button's value.
        const isActive = currentMoment?.[fieldName] === expectedValue;

        // Return a class name that lets CSS style active buttons.
        return isActive ? "quick-adjust-button active" : "quick-adjust-button";
    }
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
            <section className="hero-card compact-hero-card parent-hero-card">
                <p className="eyebrow">Parent Setup</p>

                <h1>What’s happening right now?</h1>

                <p>
                    Set the moment. The kid side will use this to choose better quests.
                </p>
            </section>

            <section className="panel parent-now-card">
                <div>
                    <p className="eyebrow dark">Right now</p>

                    <h2>{getMomentValue("parentActivity", "Choose a preset")}</h2>

                    <div className="parent-now-chips">
                        <span>{Number(currentMoment?.timeNeededMinutes) || 20} min</span>
                        <span>{getMomentValue("space", "Space not set")}</span>
                        <span>{getMomentValue("noiseLevel", "Noise not set")}</span>
                        <span>{getMomentValue("messLevel", "Mess not set")}</span>
                        <span>{getMomentValue("supervisionLevel", "Help not set")}</span>
                    </div>
                </div>
            </section>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <h2>Pick the closest moment</h2>

                        <p>Choose one, then fine-tune it below.</p>
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

            <section className="panel parent-fine-tune-panel">
                <div className="panel-header compact-panel-header">
                    <div>
                        <p className="eyebrow dark">Fine tune</p>
                        <h2>Adjust the moment</h2>
                    </div>
                </div>

                <div className="quick-chip-group">
                    <h3>Time</h3>

                    <div className="quick-chip-row">
                        <button
                            type="button"
                            className={quickChipClass("timeNeededMinutes", 10)}
                            onClick={() => applyMomentChip({ timeNeededMinutes: 10 })}
                        >
                            10 min
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("timeNeededMinutes", 20)}
                            onClick={() => applyMomentChip({ timeNeededMinutes: 20 })}
                        >
                            20 min
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("timeNeededMinutes", 30)}
                            onClick={() => applyMomentChip({ timeNeededMinutes: 30 })}
                        >
                            30 min
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("timeNeededMinutes", 45)}
                            onClick={() => applyMomentChip({ timeNeededMinutes: 45 })}
                        >
                            45 min
                        </button>
                    </div>
                </div>

                <div className="quick-chip-group">
                    <h3>Noise</h3>

                    <div className="quick-chip-row">
                        <button
                            type="button"
                            className={quickChipClass("noiseLevel", "quiet")}
                            onClick={() => applyMomentChip({ noiseLevel: "quiet" })}
                        >
                            Quiet
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("noiseLevel", "normal")}
                            onClick={() => applyMomentChip({ noiseLevel: "normal" })}
                        >
                            Normal
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("noiseLevel", "loud")}
                            onClick={() => applyMomentChip({ noiseLevel: "loud" })}
                        >
                            Loud okay
                        </button>
                    </div>
                </div>

                <div className="quick-chip-group">
                    <h3>Mess</h3>

                    <div className="quick-chip-row">
                        <button
                            type="button"
                            className={quickChipClass("messLevel", "low")}
                            onClick={() => applyMomentChip({ messLevel: "low" })}
                        >
                            Low
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("messLevel", "medium")}
                            onClick={() => applyMomentChip({ messLevel: "medium" })}
                        >
                            Medium
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("messLevel", "high")}
                            onClick={() => applyMomentChip({ messLevel: "high" })}
                        >
                            Messy okay
                        </button>
                    </div>
                </div>

                <div className="quick-chip-group">
                    <h3>Help</h3>

                    <div className="quick-chip-row">
                        <button
                            type="button"
                            className={quickChipClass("supervisionLevel", "independent")}
                            onClick={() =>
                                applyMomentChip({
                                    supervisionLevel: "independent",
                                    availability: "do-not-interrupt",
                                })
                            }
                        >
                            Independent
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("supervisionLevel", "mostly-independent")}
                            onClick={() =>
                                applyMomentChip({
                                    supervisionLevel: "mostly-independent",
                                    availability: "ask-first",
                                })
                            }
                        >
                            Ask first
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("supervisionLevel", "nearby")}
                            onClick={() =>
                                applyMomentChip({
                                    supervisionLevel: "nearby",
                                    availability: "helper-welcome",
                                })
                            }
                        >
                            Can help
                        </button>
                    </div>
                </div>

                <div className="quick-chip-group">
                    <h3>Space</h3>

                    <div className="quick-chip-row">
                        <button
                            type="button"
                            className={quickChipClass("space", "Living room")}
                            onClick={() => applyMomentChip({ space: "Living room" })}
                        >
                            Living room
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("space", "Kitchen table")}
                            onClick={() => applyMomentChip({ space: "Kitchen table" })}
                        >
                            Kitchen table
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("space", "Bedroom")}
                            onClick={() => applyMomentChip({ space: "Bedroom" })}
                        >
                            Bedroom
                        </button>

                        <button
                            type="button"
                            className={quickChipClass("space", "Backyard")}
                            onClick={() => applyMomentChip({ space: "Backyard" })}
                        >
                            Backyard
                        </button>
                    </div>
                </div>
            </section>

            <details className="advanced-parent-controls">
                <summary>Advanced controls</summary>

                <section className="panel quick-adjust-panel">
                    <p className="eyebrow dark">Quick adjust</p>

                    <h2>Fine-tune right now</h2>

                    <p>
                        Use these when the main preset is mostly right, but one thing needs to
                        change.
                    </p>

                    <div className="quick-adjust-group">
                        <h3>Time needed</h3>

                        <div className="quick-adjust-buttons">
                            <button
                                type="button"
                                className={quickAdjustButtonClass("timeNeededMinutes", 10)}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        timeNeededMinutes: 10,
                                    })
                                }
                            >
                                Need 10 min
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("timeNeededMinutes", 20)}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        timeNeededMinutes: 20,
                                    })
                                }
                            >
                                Need 20 min
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("timeNeededMinutes", 30)}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        timeNeededMinutes: 30,
                                    })
                                }
                            >
                                Need 30 min
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("timeNeededMinutes", 45)}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        timeNeededMinutes: 45,
                                    })
                                }
                            >
                                Need 45 min
                            </button>
                        </div>
                    </div>

                    <div className="quick-adjust-group">
                        <h3>Noise</h3>

                        <div className="quick-adjust-buttons">
                            <button
                                type="button"
                                className={quickAdjustButtonClass("noiseLevel", "quiet")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        noiseLevel: "quiet",
                                    })
                                }
                            >
                                Quiet needed
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("noiseLevel", "normal")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        noiseLevel: "normal",
                                    })
                                }
                            >
                                Normal noise okay
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("noiseLevel", "loud")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        noiseLevel: "loud",
                                    })
                                }
                            >
                                Loud is okay
                            </button>
                        </div>
                    </div>

                    <div className="quick-adjust-group">
                        <h3>Mess</h3>

                        <div className="quick-adjust-buttons">
                            <button
                                type="button"
                                className={quickAdjustButtonClass("messLevel", "low")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        messLevel: "low",
                                    })
                                }
                            >
                                No mess
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("messLevel", "medium")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        messLevel: "medium",
                                    })
                                }
                            >
                                Medium mess okay
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("messLevel", "high")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        messLevel: "high",
                                    })
                                }
                            >
                                Messy is okay
                            </button>
                        </div>
                    </div>

                    <div className="quick-adjust-group">
                        <h3>Supervision</h3>

                        <div className="quick-adjust-buttons">
                            <button
                                type="button"
                                className={quickAdjustButtonClass("supervisionLevel", "independent")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        supervisionLevel: "independent",
                                        availability: "do-not-interrupt",
                                    })
                                }
                            >
                                Independent only
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("supervisionLevel", "mostly-independent")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        supervisionLevel: "mostly-independent",
                                        availability: "ask-first",
                                    })
                                }
                            >
                                Mostly independent
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("supervisionLevel", "nearby")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        supervisionLevel: "nearby",
                                        availability: "helper-welcome",
                                    })
                                }
                            >
                                Kid can help
                            </button>
                        </div>
                    </div>

                    <div className="quick-adjust-group">
                        <h3>Space</h3>

                        <div className="quick-adjust-buttons">
                            <button
                                type="button"
                                className={quickAdjustButtonClass("space", "Living room")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        space: "Living room",
                                    })
                                }
                            >
                                Living room
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("space", "Kitchen table")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        space: "Kitchen table",
                                    })
                                }
                            >
                                Kitchen table
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("space", "Bedroom")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        space: "Bedroom",
                                    })
                                }
                            >
                                Bedroom
                            </button>

                            <button
                                type="button"
                                className={quickAdjustButtonClass("space", "Backyard")}
                                onClick={() =>
                                    applyCurrentMomentQuickAdjust({
                                        space: "Backyard",
                                    })
                                }
                            >
                                Backyard
                            </button>
                        </div>
                    </div>
                </section>
            </details>



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
                            <option value="loud">Active / loud is okay</option>
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