/* FamilyFlow service worker — app shell + offline Activity V2 / Rescue / Plan B.
 * Never treat cached auth/subscription as server authorization.
 */
const CACHE_NAME = "familyflow-shell-v5";
const API_CACHE = "familyflow-api-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/logo.svg",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isCacheableApi(pathname) {
  return (
    pathname.startsWith("/api/preset-activities") ||
    pathname === "/api/shared-activities/rescue" ||
    pathname === "/api/shared-activities/plan-b"
  );
}

function isAppNavigation(pathname) {
  return (
    pathname === "/" ||
    pathname === "/app" ||
    pathname === "/parent" ||
    pathname === "/kid" ||
    pathname === "/quest" ||
    pathname === "/onboarding" ||
    pathname === "/settings" ||
    pathname === "/insights" ||
    pathname === "/login" ||
    pathname === "/signup"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" && request.method !== "POST") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.method === "GET" && isCacheableApi(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Keep SPA routes (including active Activity V2 on /quest) available offline.
  if (request.mode === "navigate" || isAppNavigation(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (response.ok && request.url.includes("/assets/")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_QUEUE") {
    // Client flushes analytics / offline queue when online.
  }
});
