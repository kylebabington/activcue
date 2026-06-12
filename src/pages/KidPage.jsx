// src/pages/KidPage.jsx

import MomentStatusBanner from "../components/MomentStatusBanner";

function KidPage({
  currentMoment,
  kidEnergyLevel,
  setKidEnergyLevel,
  kidActivityStyle,
  setKidActivityStyle,
  handleGenerateKidActivities,
  handleStartSomethingForMe,
  isLoading,
}) {
  function energyChipClass(energyLevel) {
    return kidEnergyLevel === energyLevel
      ? `kid-energy-chip active kid-energy-chip--${energyLevel}`
      : `kid-energy-chip kid-energy-chip--${energyLevel}`;
  }

  function styleButtonClass(activityStyle) {
    return kidActivityStyle === activityStyle
      ? `kid-style-button active kid-style-button--${activityStyle}`
      : `kid-style-button kid-style-button--${activityStyle}`;
  }

  return (
    <section className="page-layout page-layout--kid">
      <section className="page-intro page-intro--kid">
        <p className="eyebrow dark">Kid Mode</p>

        <h1>What sounds good?</h1>
      </section>

      <div className="kid-center-column">
        <MomentStatusBanner currentMoment={currentMoment} />

        {currentMoment?.availability === "do-not-interrupt" && (
          <section className="panel try-first-panel">
            <p className="eyebrow dark">Try this first</p>

            <h2>Grown-up is busy right now.</h2>

            <ol>
              <li>Start one activity.</li>
              <li>Try it for at least 10 minutes.</li>
              <li>Then ask for help if you still need it.</li>
            </ol>
          </section>
        )}

        <section className="panel kid-main-panel">
          <div className="kid-energy-picker">
            <h3>My energy is...</h3>

            <div className="kid-energy-row chip-grid">
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
              onClick={() => setKidActivityStyle("simple")}
              disabled={isLoading}
            >
              <span>Simple</span>
              <small>Easy, clear, no big story</small>
            </button>

            <button
              type="button"
              className={styleButtonClass("imaginative")}
              onClick={() => setKidActivityStyle("imaginative")}
              disabled={isLoading}
            >
              <span>Imaginative</span>
              <small>Pretend, mission, story play</small>
            </button>
          </div>

          <button
            type="button"
            className="im-bored-button"
            onClick={handleGenerateKidActivities}
            disabled={isLoading}
          >
            {isLoading ? "Finding..." : "I'm Bored"}
          </button>

          <button
            type="button"
            className="fast-start-button fast-start-button--secondary"
            onClick={handleStartSomethingForMe}
            disabled={isLoading}
          >
            {isLoading ? "Finding..." : "Start for me"}
          </button>
        </section>
      </div>
    </section>
  );
}

export default KidPage;
