// src/components/landing/LandingSituations.jsx

import { Link } from "react-router-dom";
import { BRAND } from "../../config/brand.js";
import {
  LANDING_SITUATIONS,
  buildDemoUrl,
} from "../../constants/landingSituations";
import { trackProductEvent } from "../../utils/analytics";

/**
 * Problem-moment grid: each card deep-links into /demo with defaults.
 */
export default function LandingSituations() {
  return (
    <section
      className="landing-section"
      id="moments"
      aria-labelledby="moments-title"
    >
      <div className="landing-section-inner landing-section-inner--wide">
        <h2 id="moments-title">What kind of moment are you in?</h2>
        <p className="landing-section-lead">
          Pick a real situation — {BRAND.name} will match something that fits.
        </p>
        <div className="landing-situations-grid" role="list">
          {LANDING_SITUATIONS.map((situation) => (
            <Link
              key={situation.id}
              role="listitem"
              className="landing-situation"
              to={buildDemoUrl(situation)}
              onClick={() =>
                trackProductEvent("demo_started", {
                  source: "landing_situation",
                  situationId: situation.id,
                  momentId: situation.momentId,
                })
              }
            >
              <span className="landing-situation-quote">
                &ldquo;{situation.quote}&rdquo;
              </span>
              <span className="landing-situation-cta">Try this moment</span>
            </Link>
          ))}
        </div>
        <div className="landing-section-cta">
          <Link
            className="landing-btn landing-btn--primary"
            to="/demo"
            onClick={() =>
              trackProductEvent("demo_started", { source: "moments" })
            }
          >
            Try {BRAND.name}
          </Link>
        </div>
      </div>
    </section>
  );
}
