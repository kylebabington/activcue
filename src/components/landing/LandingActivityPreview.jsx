import { Link } from "react-router-dom";
import { BRAND } from "../../config/brand.js";
import { LANDING_ACTIVITY_PREVIEW } from "../../constants/landingActivityPreview";
import {
  buildDemoUrl,
  getLandingSituation,
} from "../../constants/landingSituations";
import { trackProductEvent } from "../../utils/analytics";

/**
 * A real ActivCue activity, shown on the landing page so parents
 * understand the product before they click Try.
 */
export default function LandingActivityPreview() {
  const preview = LANDING_ACTIVITY_PREVIEW;
  const situation = getLandingSituation(preview.situationId);
  const demoUrl = buildDemoUrl(situation);

  return (
    <section
      className="landing-section landing-activity-preview-section"
      id="example"
      aria-labelledby="example-title"
    >
      <div className="landing-section-inner landing-section-inner--wide">
        <p className="landing-activity-preview-kicker">{preview.kicker}</p>
        <h2 id="example-title" className="visually-hidden">
          A sample {BRAND.name} activity
        </h2>

        <article className="landing-activity-preview">
          <header className="landing-activity-preview-header">
            <h3>{preview.title}</h3>
            <p className="landing-activity-preview-meta">
              {(preview.meta || []).join(" · ")}
            </p>
          </header>

          <div className="landing-activity-preview-grid">
            <section>
              <p className="landing-activity-preview-label">Your mission</p>
              <p>{preview.mission}</p>
            </section>
            <section>
              <p className="landing-activity-preview-label">What you need</p>
              <ul>
                {(preview.uses || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section>
              <p className="landing-activity-preview-label">Your first move</p>
              <p>{preview.firstMove}</p>
            </section>
            <section>
              <p className="landing-activity-preview-label">If you&apos;re stuck</p>
              <p>{preview.ifStuck}</p>
            </section>
            <section className="landing-activity-preview-finish">
              <p className="landing-activity-preview-label">Big finish</p>
              <p>{preview.finish}</p>
            </section>
          </div>
        </article>

        <div className="landing-section-cta">
          <Link
            className="landing-btn landing-btn--primary"
            to={demoUrl}
            onClick={() =>
              trackProductEvent("demo_started", {
                source: "landing_activity_preview",
                situationId: preview.situationId,
              })
            }
          >
            Try this with my kid
          </Link>
        </div>
      </div>
    </section>
  );
}
