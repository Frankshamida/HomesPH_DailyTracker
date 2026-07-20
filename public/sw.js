// Homes.ph Daily Task Tracker — minimal service worker (enables PWA install)
const CACHE = "hph-cache-v1";
const APP_SHELL = ["/dashboard", "/login", "/homesph-mark.png", "/homesph-logo-white.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigations/GETs, fall back to cache when offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // never cache Supabase / API calls — always go to network
  if (url.pathname.startsWith("/api") || url.hostname.includes("supabase")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/dashboard")))
  );
});
