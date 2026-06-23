// Offline support for Artifact Gallery.
// HTML is network-first (so updates always arrive when online — avoids stale
// app), static assets are cache-first. Bump CACHE to invalidate old caches.
const CACHE = "arti-v1";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./favicon.svg", "./favicon-32.png", "./apple-touch-icon.png",
  "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // leave cross-origin requests alone

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    // network-first
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }
  // cache-first for static assets
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
    }))
  );
});
