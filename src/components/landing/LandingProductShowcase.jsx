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
    src: "/marketing/select-moment.png",
    alt: "Parent screen: pick what's happening, Cooking dinner selected",
  },
  {
    id: "personalize",
    title: "Child-specific fit",
    caption: "Ages and independence change what shows up.",
    src: "/marketing/child-fit.png",
    alt: "Kid screen: who's playing, energy, and Simple or Pretend",
  },
  {
    id: "match",
    title: "Get a fitted activity",
    caption: "Ranked for this age and this situation — not a random list.",
    src: "/marketing/fitted-activity.png",
    alt: "Three ranked activity matches with Best fit highlighted",
  },
  {
    id: "instructions",
    title: "Clear activity steps",
    caption: "Mission, materials, and what to do next.",
    src: "/marketing/activity-details.png",
    alt: "Activity details with overview, materials, and Enter the story",
  },
  {
    id: "play",
    title: "Start the activity",
    caption: "Guided steps kids can follow without a long brief.",
    src: "/marketing/activity-steps.png",
    alt: "Activity started view showing Step 1 instructions",
  },
];

/**
 * See FamilyFlow — demo video + captioned product screenshots.
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
              Watch 30-second walkthrough
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
              <div className="landing-product-frame-visual">
                <img
                  src={frame.src}
                  alt={frame.alt}
                  className="landing-product-frame-img"
                  width="640"
                  height="360"
                  loading="lazy"
                  decoding="async"
                />
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
