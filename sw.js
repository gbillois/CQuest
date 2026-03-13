const CACHE_VERSION = "cquest-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/main.js",
  "./src/pwa.js",
  "./src/constants.js",
  "./src/state.js",
  "./src/ui.js",
  "./src/asset-loader.js",
  "./src/renderer.js",
  "./src/entities.js",
  "./src/physics.js",
  "./src/conjugation.js",
  "./src/persistence.js",
  "./src/level-generator.js",
  "./src/level-validator.js",
  "./src/sprite-manifest.js",
  "./src/utils.js",
  "./src/logger.js",
  "./level_generation_config.json",
  "./level-blocks.json",
  "./sprite-manifest.json",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === "opaque") {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
});
