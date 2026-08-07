// src/components/landing/LandingProductShowcase.jsx

import { Link } from "react-router-dom";
import {
  DEMO_VIDEO_POSTER_SRC,
  DEMO_VIDEO_SRC,
} from "../../constants/demoVideo";
import { trackProductEvent } from "../../utils/analytics";

const PRODUCT_FRAMES = [
  {
    id: "situation",
    title: "Select the moment",
    caption: "Time, mess, and how independent kids need to be.",
  },
  {
    id: "match",
    title: "Get a fitted activity",
    caption: "Ranked for this age and this situation — not a random list.",
  },
  {
    id: "instructions",
    title: "Clear activity steps",
    caption: "Mission, materials, and what to do next.",
  },
  {
    id: "plan-b",
    title: "Plan B ready",
    caption: "Didn't land? Try the next already-matched option.",
  },
  {
    id: "personalize",
    title: "Child-specific fit",
    caption: "Ages and independence change what shows up.",
  },
];

/**
 * See FamilyFlow — demo video + captioned product frames.
 * Swap frame backgrounds for /public/marketing/* screenshots later.
 */
export default function LandingProductShowcase({
  hasVideo = false,
  onOpenVideo,
}) {
  return (
    <section
      className="landing-section landing-section--tint"
      id="product"
      aria-labelledby="product-title"
    >
      <div className="landing-section-inner landing-section-inner--wide">
        <h2 id="product-title">See FamilyFlow</h2>
        <p className="landing-section-lead">
          Watch the loop before you create an account.
        </p>

        {hasVideo ? (
          <button
            type="button"
            className="landing-product-video"
            onClick={() => {
              onOpenVideo?.();
              trackProductEvent("landing_demo_video_opened", {
                source: "product_showcase",
              });
            }}
          >
            <img
              src={DEMO_VIDEO_POSTER_SRC}
              alt=""
              className="landing-product-video-poster"
              width="960"
              height="540"
            />
            <span className="landing-product-video-play">
              Watch 45-second walkthrough
            </span>
            <span className="visually-hidden">
              Open FamilyFlow demo video ({DEMO_VIDEO_SRC})
            </span>
          </button>
        ) : null}

        <div className="landing-product-frames" role="list">
          {PRODUCT_FRAMES.map((frame) => (
            <article
              key={frame.id}
              className="landing-product-frame"
              role="listitem"
              data-frame={frame.id}
            >
              <div className="landing-product-frame-visual" aria-hidden="true">
                <span className="landing-product-frame-chrome" />
              </div>
              <h3>{frame.title}</h3>
              <p>{frame.caption}</p>
            </article>
          ))}
        </div>

        <div className="landing-section-cta">
          <Link
            className="landing-btn landing-btn--primary"
            to="/demo"
            onClick={() =>
              trackProductEvent("demo_started", { source: "product" })
            }
          >
            Try the demo
          </Link>
        </div>
      </div>
    </section>
  );
}
