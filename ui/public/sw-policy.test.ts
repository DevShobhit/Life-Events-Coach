import { describe, expect, test } from "bun:test";

const source = await Bun.file("public/sw.js").text();

type WorkerEvent = {
  request?: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
  respondWith?: (promise: Promise<Response>) => void;
};

async function loadWorker() {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const cacheEntries = new Map<string, Response>();
  const deletedCaches: string[] = [];
  const cache = {
    put: async (request: Request, response: Response) => {
      cacheEntries.set(request.url, response);
    },
  };
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const originalSelf = globalThis.self;
  const responses = new Map<string, Response>();

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    const response = responses.get(url);
    if (!response) throw new Error(`network unavailable: ${url}`);
    return response.clone();
  };
  globalThis.caches = {
    open: async () => cache,
    match: async (request: Request) => cacheEntries.get(request.url),
    keys: async () => ["livecoach-shell-v1", "unrelated-cache"],
    delete: async (name: string) => {
      deletedCaches.push(name);
      return true;
    },
  } as unknown as CacheStorage;
  globalThis.self = {
    location: { origin: "https://app.test" },
    clients: { claim: async () => undefined },
    skipWaiting: () => undefined,
    addEventListener: (name: string, handler: (event: WorkerEvent) => void) => {
      listeners.set(name, handler);
    },
  } as unknown as Window & typeof globalThis;

  (0, eval)(source);
  return {
    listeners,
    cacheEntries,
    deletedCaches,
    responses,
    restore: () => {
      globalThis.fetch = originalFetch;
      globalThis.caches = originalCaches;
      globalThis.self = originalSelf;
    },
  };
}

function requestWithDestination(url: string, destination: RequestDestination, method = "GET") {
  const request = new Request(url, { method });
  Object.defineProperty(request, "destination", { value: destination });
  return request;
}

describe("service worker cache policy", () => {
  test("uses a versioned application cache and removes obsolete versions", () => {
    expect(source).toContain('const CACHE_PREFIX = "livecoach-shell-"');
    expect(source).toContain("name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME");
  });

  test("limits interception to same-origin documents and static assets", () => {
    expect(source).toContain('request.method !== "GET"');
    expect(source).toContain("!isSameOrigin(request)");
    expect(source).toContain('request.destination === "document"');
    expect(source).toContain("isCacheableAsset(request)");
  });

  test("does not cache API or mutation traffic", () => {
    expect(source).toContain('request.method !== "GET"');
    expect(source).not.toContain("cache.put(request, response.clone())`); // API");
  });

  test("runs the lifecycle policy for documents, assets, and API requests", async () => {
    const worker = await loadWorker();
    const navigation = requestWithDestination("https://app.test/now", "document");
    const asset = requestWithDestination("https://app.test/_next/app.js", "script");
    const api = new Request("https://app.test/api/roadmap", { method: "GET" });
    const mutation = new Request("https://app.test/api/actions", { method: "POST" });
    const navigationResponse = { ok: true, type: "basic", clone: () => navigationResponse } as unknown as Response;
    const assetResponse = { ok: true, type: "basic", clone: () => assetResponse } as unknown as Response;
    worker.responses.set(navigation.url, navigationResponse);
    worker.responses.set(asset.url, assetResponse);

    worker.listeners.get("activate")?.({ waitUntil: (promise) => promise });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(worker.deletedCaches).toEqual(["livecoach-shell-v1"]);

    const respond = (request: Request) => {
      let responsePromise: Promise<Response> | undefined;
      worker.listeners.get("fetch")?.({
        request,
        respondWith: (promise) => {
          responsePromise = promise;
        },
      });
      return responsePromise;
    };

    expect(await respond(navigation)).toBe(navigationResponse);
    expect(await respond(asset)).toBe(assetResponse);
    expect(respond(api)).toBeUndefined();
    expect(respond(mutation)).toBeUndefined();
    expect([...worker.cacheEntries.keys()]).toEqual([navigation.url, asset.url]);
    worker.restore();
  });
});
