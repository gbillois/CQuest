// ─── ConjugQuest Service Worker ───────────────────────────────
// Bump CACHE_NAME to trigger an update prompt on every deploy.
const CACHE_NAME = 'cq-v2';

// Core shell — cached at install time so the app works offline immediately.
const PRECACHE = [
  './',
  './index.html',
  './js/data.js',
  './js/game.js',
  './js/sprites.js',
  './manifest.json',
  './assets/left-right.png',
  './assets/up.png',
  './assets/platforms/forest-sheet.png',
  './assets/platforms/desert-sheet.png',
  './assets/platforms/snow-sheet.png',
  './assets/platforms/mountain-sheet.png',
  './assets/platforms/desolation-sheet.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

// ── Install : pre-cache the shell ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
    // Do NOT skipWaiting here — the update banner in the app handles it.
  );
});

// ── Activate : remove stale caches ────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch : cache-first, with network fallback + dynamic caching ─
self.addEventListener('fetch', e => {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => cached); // offline: return whatever we have
    })
  );
});

// ── Message : allow the page to trigger skipWaiting ───────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
