import { describe, expect, test } from "bun:test";

import type { RoadmapResponse } from "@/lib/api/types";
import { createRoadmapOfflineStore } from "./roadmap-cache";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    keys: () => [...values.keys()],
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

  test("uses an unambiguous structured key for roadmap identity", () => {
    const storage = memoryStorage();
    const store = createRoadmapOfflineStore(storage);

    store.write("user:one", "phase", "arrived", roadmap);
    store.write("user", "one:phase", "arrived", { ...roadmap, version: 2 });

    expect(storage.keys()).toHaveLength(2);
    expect(store.read("user:one", "phase", "arrived")).toEqual(roadmap);
    expect(store.read("user", "one:phase", "arrived")?.version).toBe(2);
  });

  test("deduplicates and replays queued actions", async () => {
    const store = createRoadmapOfflineStore(memoryStorage());
    const action = {
      userId: "user",
      phaseId: "relocation",
      stage: "arrived",
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

  test("normalizes legacy queued actions and discards malformed items", () => {
    const storage = memoryStorage();
    storage.setItem(
      "livecoach:actions",
      JSON.stringify([
        {
          userId: "user",
          phaseId: "relocation",
          concernId: "legacy",
          action: "done",
          idempotencyKey: "legacy-key",
        },
        { userId: "spoofed", action: "done" },
        { userId: "user", phaseId: "phase", stage: "   ", action: "done" },
        { userId: "user", phaseId: "phase", stage: 42, action: "done" },
      ]),
    );
    const store = createRoadmapOfflineStore(storage);
    const queued = store.queued();

    expect(queued).toEqual([
      {
        userId: "user",
        phaseId: "relocation",
        stage: "arrived",
        concernId: "legacy",
        action: "done",
        idempotencyKey: "legacy-key",
      },
    ]);
  });

  test("accepts non-empty custom stages", () => {
    const store = createRoadmapOfflineStore(memoryStorage());
    store.enqueue({
      userId: "user",
      phaseId: "relocation",
      stage: " custom-stage ",
      concernId: "housing",
      action: "done",
      idempotencyKey: "custom-stage-key",
    });

    expect(store.queued()).toEqual([
      {
        userId: "user",
        phaseId: "relocation",
        stage: "custom-stage",
        concernId: "housing",
        action: "done",
        idempotencyKey: "custom-stage-key",
      },
    ]);
  });

  test("discards malformed queue JSON without submitting it", async () => {
    const storage = memoryStorage();
    storage.setItem("livecoach:actions", "{not-json");
    const store = createRoadmapOfflineStore(storage);
    const submitted: QueuedAction[] = [];

    expect(await store.replay(async (action) => submitted.push(action))).toBe(
      0,
    );
    expect(submitted).toEqual([]);
    expect(store.queued()).toEqual([]);
  });

  test("clears only one subject's cached roadmaps and queued actions", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      get length() {
        return values.size;
      },
      key: (index: number) => [...values.keys()][index] ?? null,
    };
    const store = createRoadmapOfflineStore(storage);
    const roadmap = {
      phase_id: "relocation",
      version: 1,
      now: [],
      horizon: [],
      current: null,
      citations: [],
    };
    store.write("user-a", "relocation", "arrived", roadmap);
    store.write("user-b", "relocation", "arrived", roadmap);
    store.enqueue({
      userId: "user-a",
      phaseId: "relocation",
      stage: "arrived",
      concernId: "a",
      action: "done",
      idempotencyKey: "a",
    });
    store.enqueue({
      userId: "user-b",
      phaseId: "relocation",
      stage: "arrived",
      concernId: "b",
      action: "done",
      idempotencyKey: "b",
    });

    store.clearUser("user-a");

    expect(store.read("user-a", "relocation", "arrived")).toBeNull();
    expect(store.read("user-b", "relocation", "arrived")).not.toBeNull();
    expect(store.queued().map((action) => action.userId)).toEqual(["user-b"]);
  });
});
