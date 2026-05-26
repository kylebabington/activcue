// src/pages/KidPage.jsx

import { Link } from "react-router-dom";

// This page is the child-facing launch page.
// The kid should not need to understand settings.
// They just choose what they need.

function KidPage({
    parentStatus,
    ParentStatusCard,
    handleKidQuickChoice,
    isLoading,
}) {
    return (
        <section className="page-layout kid-mode">
            <section className="panel kid-status-panel">
                <h2>What is the adult doing?</h2>

                <ParentStatusCard parentStatus={parentStatus} />

                {parentStatus.availability === "do-not-interrupt" && (
                    <div className="try-first-box">
                        <h3>Try this first</h3>

                        <ol>
                            <li>Pick one quest.</li>
                            <li>Try it for 10 minutes.</li>
                            <li>Then ask for help if you still need it.</li>
                        </ol>
                    </div>
                )}
            </section>

            <section className="panel">
                <h2>What do you want to do?</h2>

                <p className="kid-helper-text">
                    Pick one. The app will give you a few quests.
                </p>

                <div className="kid-choice-grid">
                    <button
                        disabled={isLoading}
                        onClick={() => handleKidQuickChoice("bored")}
                    >
                        I’m bored
                    </button>

                    <button
                        disabled={isLoading}
                        onClick={() => handleKidQuickChoice("move")}
                    >
                        I need to move
                    </button>

                    <button
                        disabled={isLoading}
                        onClick={() => handleKidQuickChoice("make")}
                    >
                        I want to make something
                    </button>

                    <button
                        disabled={isLoading}
                        onClick={() => handleKidQuickChoice("quiet")}
                    >
                        I want quiet time
                    </button>

                    <button
                        disabled={isLoading}
                        onClick={() => handleKidQuickChoice("help")}
                    >
                        I want to help
                    </button>

                    <button
                        disabled={isLoading}
                        onClick={() => handleKidQuickChoice("surprise")}
                    >
                        Surprise me
                    </button>
                </div>

                {isLoading && (
                    <p className="loading-note">
                        Thinking up quests...
                    </p>
                )}

                <div className="page-actions">
                    <Link className="ghost-link-button" to="/parent">
                        Back to parent
                    </Link>

                    <Link className="ghost-link-button" to="/quest">
                        View quests
                    </Link>
                </div>
            </section>
        </section>
    );
}

export default KidPage;