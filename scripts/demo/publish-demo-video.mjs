/**
 * Copy the newest Playwright webm from scripts/demo/output into public/demos.
 *
 * Usage (after demo:record):
 *   node scripts/demo/publish-demo-video.mjs
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "output");
const publicDemos = path.resolve(__dirname, "../../public/demos");
const cacheKeyFile = path.resolve(
  __dirname,
  "../../src/constants/demoVideo.js"
);

function findVideos(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findVideos(full, acc);
    else if (entry.name.endsWith(".webm")) acc.push(full);
  }
  return acc;
}

const videos = findVideos(outputDir).sort(
  (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
);

if (videos.length === 0) {
  console.error(
    "No .webm files found under scripts/demo/output. Run npm run demo:record first."
  );
  process.exit(1);
}

// Prefer the /demo product walkthrough when both recordings exist.
const preferred =
  videos.find((file) => /landing-demo/i.test(file)) || videos[0];

fs.mkdirSync(publicDemos, { recursive: true });
const dest = path.join(publicDemos, "familyflow-demo.webm");
fs.copyFileSync(preferred, dest);
console.log(`Published ${preferred} -> ${dest}`);

const hash = crypto
  .createHash("sha1")
  .update(fs.readFileSync(dest))
  .digest("hex")
  .slice(0, 10);

fs.writeFileSync(
  cacheKeyFile,
  `// Auto-updated by npm run demo:publish so landing video URLs bust caches.
export const DEMO_VIDEO_CACHE_KEY = "${hash}";

export const DEMO_VIDEO_SRC = \`/demos/familyflow-demo.webm?v=\${DEMO_VIDEO_CACHE_KEY}\`;
export const DEMO_VIDEO_POSTER_SRC = \`/demos/familyflow-demo-poster.svg?v=\${DEMO_VIDEO_CACHE_KEY}\`;
`
);
console.log(`Updated demo video cache key -> ${hash}`);

const posterSrc = path.join(publicDemos, "familyflow-demo-poster.webp");
if (!fs.existsSync(posterSrc)) {
  console.log(
    "Optional: add `public/demos/familyflow-demo-poster.svg` (or `.webp`) as a 1280×720 poster frame."
  );
}
