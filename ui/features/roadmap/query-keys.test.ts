import { describe, expect, test } from "bun:test";
import { ROADMAP_QUERY_STALE_TIME_MS } from "@/lib/query/query-client";
import { roadmapQueryOptions } from "./queries";
import { roadmapQueryKeys } from "./query-keys";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const roadmap = {
  phase_id: "phase",
  version: 1,
  now: [],
  current: null,
  horizon: [],
};

describe("roadmap query keys", () => {
  test("builds the stable detail key", () => {
    expect(roadmapQueryKeys.detail("user", "phase", "arrived")).toEqual([
      "roadmap",
      "detail",
      "user",
      "phase",
      "arrived",
    ]);
  });

  test("applies the roadmap freshness policy to detail reads", () => {
    const options = roadmapQueryOptions("user", "phase");

    expect(options.queryKey).toEqual(roadmapQueryKeys.detail("user", "phase"));
    expect(options.staleTime).toBe(ROADMAP_QUERY_STALE_TIME_MS);
    expect(options.refetchOnReconnect).toBe(false);
  });

  test("keeps query keys and offline placeholders isolated by stage", () => {
    const storage = memoryStorage();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage },
    });
    storage.setItem(
      "livecoach:roadmap:user:phase:arrived",
      JSON.stringify({ ...roadmap, version: 1 }),
    );
    storage.setItem(
      "livecoach:roadmap:user:phase:preparing",
      JSON.stringify({ ...roadmap, version: 2 }),
    );

    const arrived = roadmapQueryOptions("user", "phase", "arrived");
    const preparing = roadmapQueryOptions("user", "phase", "preparing");

    expect(arrived.queryKey).not.toEqual(preparing.queryKey);
    expect(arrived.placeholderData?.()).toMatchObject({ version: 1 });
    expect(preparing.placeholderData?.()).toMatchObject({ version: 2 });
  });
});
