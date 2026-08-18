import helmet from "helmet";

/*
 * Baseline browser isolation headers for ActivCue.
 *
 * CSP allowlists same-origin assets plus Stripe Checkout, Supabase auth, and
 * Google Fonts. Frame protection is deny/none so the app cannot be embedded.
 * Permissions-Policy turns off unused powerful APIs; camera stays same-origin
 * for the inventory barcode scanner.
 */
export const CONTENT_SECURITY_POLICY_DIRECTIVES = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "script-src": ["'self'", "https://js.stripe.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
  "img-src": ["'self'", "data:", "blob:", "https://*.stripe.com"],
  "media-src": ["'self'", "blob:"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.stripe.com",
  ],
  "frame-src": ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
  "form-action": ["'self'", "https://checkout.stripe.com"],
};

export const REFERRER_POLICY = "strict-origin-when-cross-origin";

export const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=(self)",
  "camera=(self)",
  "display-capture=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "picture-in-picture=(self)",
  "publickey-credentials-get=()",
  "usb=()",
  "interest-cohort=()",
].join(", ");

export const HELMET_OPTIONS = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: CONTENT_SECURITY_POLICY_DIRECTIVES,
  },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: REFERRER_POLICY },
};

export function applySecurityHeaders(app) {
  app.use(helmet(HELMET_OPTIONS));
  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
    next();
  });
}
