export const SERVICE_WORKER_CACHE_PREFIX = "livecoach-shell-";

export function isServiceWorkerResetRequested(search: string) {
  return new URLSearchParams(search).get("reset_sw") === "1";
}

export function isApplicationServiceWorkerCache(name: string) {
  return name.startsWith(SERVICE_WORKER_CACHE_PREFIX);
}

export async function resetApplicationServiceWorker() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
  }
  if (typeof caches !== "undefined") {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(isApplicationServiceWorkerCache)
        .map((name) => caches.delete(name)),
    );
  }
}
