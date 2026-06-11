// src/pages/KidPage.jsx

function KidPage({
    currentMoment,
    ParentStatusCard,
    kidEnergyLevel,
    setKidEnergyLevel,
    kidActivityStyle,
    handleKidQuickChoice,
    handleStartSomethingForMe,
    isLoading,
}) {

    function energyChipClass(energyLevel) {
        return kidEnergyLevel === energyLevel
            ? "kid-energy-chip active"
            : "kid-energy-chip";
    }

    function styleButtonClass(activityStyle) {
        return kidActivityStyle === activityStyle
            ? "kid-style-button active"
            : "kid-style-button";
    }
    return (
        <section className="page-layout">
            <section className="hero-card compact-hero-card kid-hero-card">
                <p className="eyebrow">Kid Mode</p>

                <h1>What sounds good?</h1>

                <p>
                    Pick your energy, then choose simple or imaginative.
                </p>
            </section>

            <ParentStatusCard
                parentStatus={{
                    activity: currentMoment.parentActivity,
                    availability: currentMoment.availability,
                }}
            />

            {currentMoment?.availability === "do-not-interrupt" && (
                <section className="panel try-first-panel">
                    <p className="eyebrow dark">Try this first</p>

                    <h2>Grown-up is busy right now.</h2>

                    <ol>
                        <li>Start one quest.</li>
                        <li>Try it for at least 10 minutes.</li>
                        <li>Then ask for help if you still need it.</li>
                    </ol>
                </section>
            )}

            <section className="panel fast-start-panel kid-fast-start-panel">
                <div>
                    <p className="eyebrow dark">Fast start</p>

                    <h2>Just start something</h2>
                </div>

                <button
                    className="fast-start-button"
                    onClick={handleStartSomethingForMe}
                    disabled={isLoading}
                >
                    {isLoading ? "Finding..." : "Start for me"}
                </button>
            </section>

            <section className="panel kid-choice-panel kid-simple-choice-panel">
                <div className="panel-header compact-panel-header">
                    <div>
                        <p className="eyebrow dark">Choose</p>
                        <h2>What kind of activity?</h2>
                    </div>
                </div>

                <div className="kid-energy-picker">
                    <h3>My energy is...</h3>

                    <div className="kid-energy-row">
                        <button
                            type="button"
                            className={energyChipClass("quiet")}
                            onClick={() => setKidEnergyLevel("quiet")}
                            disabled={isLoading}
                        >
                            Quiet
                        </button>

                        <button
                            type="button"
                            className={energyChipClass("neutral")}
                            onClick={() => setKidEnergyLevel("neutral")}
                            disabled={isLoading}
                        >
                            Neutral
                        </button>

                        <button
                            type="button"
                            className={energyChipClass("energetic")}
                            onClick={() => setKidEnergyLevel("energetic")}
                            disabled={isLoading}
                        >
                            Energetic
                        </button>
                    </div>
                </div>

                <div className="kid-style-grid">
                    <button
                        type="button"
                        className={styleButtonClass("simple")}
                        onClick={() => handleKidQuickChoice("simple")}
                        disabled={isLoading}
                    >
                        <span>Simple</span>
                        <small>Easy, clear, no big story</small>
                    </button>

                    <button
                        type="button"
                        className={styleButtonClass("imaginative")}
                        onClick={() => handleKidQuickChoice("imaginative")}
                        disabled={isLoading}
                    >
                        <span>Imaginative</span>
                        <small>Pretend, mission, story play</small>
                    </button>
                </div>
            </section>
        </section>
    );
}

export default KidPage;