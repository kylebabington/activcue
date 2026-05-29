// src/pages/KidPage.jsx

function KidPage({
    parentStatus,
    currentMoment,
    ParentStatusCard,
    handleKidQuickChoice,
    handleStartSomethingForMe,
    isLoading,
}) {
    return (
        <section className="page-layout">
            <section className="hero-card">
                <p className="eyebrow">Kid Mode</p>

                <h1>What do you need?</h1>

                <p>
                    Pick the kind of help you want, or let the app start the best quest
                    for right now.
                </p>
            </section>

            <ParentStatusCard parentStatus={parentStatus} />

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

            <section className="panel fast-start-panel">
                <div>
                    <p className="eyebrow dark">Fast start</p>

                    <h2>I need something to do</h2>

                    <p>
                        Skip choosing. The app will pick the best quest for right now and
                        start it.
                    </p>
                </div>

                <button
                    className="fast-start-button"
                    onClick={handleStartSomethingForMe}
                    disabled={isLoading}
                >
                    {isLoading ? "Finding a quest..." : "Start something for me"}
                </button>
            </section>

            <section className="panel kid-choice-panel">
                <p className="eyebrow dark">Choose your mood</p>

                <h2>Or pick what you want</h2>

                <div className="kid-choice-grid">
                    <button
                        onClick={() => handleKidQuickChoice("bored")}
                        disabled={isLoading}
                    >
                        I&apos;m bored
                    </button>

                    <button
                        onClick={() => handleKidQuickChoice("move")}
                        disabled={isLoading}
                    >
                        I want to move
                    </button>

                    <button
                        onClick={() => handleKidQuickChoice("make")}
                        disabled={isLoading}
                    >
                        I want to make something
                    </button>

                    <button
                        onClick={() => handleKidQuickChoice("quiet")}
                        disabled={isLoading}
                    >
                        I need quiet
                    </button>

                    <button
                        onClick={() => handleKidQuickChoice("help")}
                        disabled={isLoading}
                    >
                        I want to help
                    </button>

                    <button
                        onClick={() => handleKidQuickChoice("surprise")}
                        disabled={isLoading}
                    >
                        Surprise me
                    </button>
                </div>
            </section>
        </section>
    );
}

export default KidPage;