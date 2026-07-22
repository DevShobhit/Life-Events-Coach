import { afterEach, describe, expect, test } from "bun:test";
import {
  isApplicationServiceWorkerCache,
  resetApplicationServiceWorker,
  SERVICE_WORKER_CACHE_PREFIX,
} from "./service-worker-recovery";

const originalNavigator = globalThis.navigator;
const originalCaches = globalThis.caches;

afterEach(() => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  });
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: originalCaches,
  });
});

describe("service-worker recovery", () => {
  test("recognizes only application-owned cache names", () => {
    expect(
      isApplicationServiceWorkerCache(`${SERVICE_WORKER_CACHE_PREFIX}v2`),
    ).toBe(true);
    expect(isApplicationServiceWorkerCache("other-application-cache")).toBe(
      false,
    );
  });

  test("unregisters workers and deletes only application caches", async () => {
    const unregistered: string[] = [];
    const deleted: string[] = [];
    const registrations = [
      { unregister: async () => void unregistered.push("first") },
      { unregister: async () => void unregistered.push("second") },
    ];
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { serviceWorker: { getRegistrations: async () => registrations } },
    });
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: {
        keys: async () => [
          `${SERVICE_WORKER_CACHE_PREFIX}v1`,
          "unrelated-cache",
          `${SERVICE_WORKER_CACHE_PREFIX}v2`,
        ],
        delete: async (name: string) => {
          deleted.push(name);
          return true;
        },
      },
    });

    await resetApplicationServiceWorker();

    expect(unregistered).toEqual(["first", "second"]);
    expect(deleted).toEqual([
      `${SERVICE_WORKER_CACHE_PREFIX}v1`,
      `${SERVICE_WORKER_CACHE_PREFIX}v2`,
    ]);
  });
});
