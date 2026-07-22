const CACHE_PREFIX = "livecoach-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isCacheableAsset(request) {
  return ["script", "style", "image", "font"].includes(request.destination);
}

async function networkFirstAsset(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("install", (event) => {
  console.debug("[service-worker] install", CACHE_NAME);
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !isSameOrigin(request)) return;
  if (request.destination === "document") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (isCacheableAsset(request)) {
    event.respondWith(networkFirstAsset(request));
  }
});
