import { describe, expect, test } from "bun:test";

import type { RoadmapResponse } from "@/lib/api/types";
import { createRoadmapOfflineStore } from "./roadmap-cache";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const roadmap: RoadmapResponse = {
  phase_id: "relocation",
  version: 1,
  now: [],
  current: null,
  horizon: [],
};

describe("roadmap offline store", () => {
  test("caches and reads the last roadmap", () => {
    const store = createRoadmapOfflineStore(memoryStorage());
    store.write("user", "relocation", "arrived", roadmap);
    expect(store.read("user", "relocation", "arrived")).toEqual(roadmap);
  });

  test("keeps cached roadmaps isolated by stage", () => {
    const store = createRoadmapOfflineStore(memoryStorage());
    const arrivedRoadmap = { ...roadmap, version: 1 };
    const preparingRoadmap = { ...roadmap, version: 2 };

    store.write("user", "relocation", "arrived", arrivedRoadmap);
    store.write("user", "relocation", "preparing", preparingRoadmap);

    expect(store.read("user", "relocation", "arrived")).toEqual(arrivedRoadmap);
    expect(store.read("user", "relocation", "preparing")).toEqual(
      preparingRoadmap,
    );
  });

  test("deduplicates and replays queued actions", async () => {
    const store = createRoadmapOfflineStore(memoryStorage());
    const action = {
      userId: "user",
      phaseId: "relocation",
      concernId: "housing",
      action: "done" as const,
      idempotencyKey: "key-1",
    };
    store.enqueue(action);
    store.enqueue(action);
    const replayed: string[] = [];
    expect(
      await store.replay(async (queued) =>
        replayed.push(queued.idempotencyKey),
      ),
    ).toBe(0);
    expect(replayed).toEqual(["key-1"]);
    expect(store.queued()).toEqual([]);
  });
});
