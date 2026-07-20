import type { CardAction, RoadmapResponse } from "@/lib/api/types";

export type QueuedAction = {
  userId: string;
  phaseId: string;
  stage: string;
  concernId: string;
  action: CardAction;
  idempotencyKey: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createRoadmapOfflineStore(
  storage: StorageLike,
  keyPrefix = "livecoach",
) {
  const roadmapKey = (userId: string, phaseId: string, stage: string) =>
    `${keyPrefix}:roadmap:${userId}:${phaseId}:${stage}`;
  const queueKey = `${keyPrefix}:actions`;

  return {
    read(
      userId: string,
      phaseId: string,
      stage: string,
    ): RoadmapResponse | null {
      const key = roadmapKey(userId, phaseId, stage);
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as RoadmapResponse;
      } catch {
        storage.removeItem(key);
        return null;
      }
    },
    write(
      userId: string,
      phaseId: string,
      stage: string,
      roadmap: RoadmapResponse,
    ) {
      storage.setItem(
        roadmapKey(userId, phaseId, stage),
        JSON.stringify(roadmap),
      );
    },
    queued(): QueuedAction[] {
      const raw = storage.getItem(queueKey);
      if (!raw) return [];
      try {
        return JSON.parse(raw) as QueuedAction[];
      } catch {
        storage.removeItem(queueKey);
        return [];
      }
    },
    enqueue(action: QueuedAction) {
      const actions = this.queued();
      if (
        !actions.some(
          (queuedAction) =>
            queuedAction.idempotencyKey === action.idempotencyKey,
        )
      ) {
        storage.setItem(queueKey, JSON.stringify([...actions, action]));
      }
    },
    async replay(execute: (action: QueuedAction) => Promise<void>) {
      const remaining: QueuedAction[] = [];
      for (const action of this.queued()) {
        try {
          await execute(action);
        } catch {
          remaining.push(action);
        }
      }
      storage.setItem(queueKey, JSON.stringify(remaining));
      return remaining.length;
    },
  };
}

export function browserRoadmapOfflineStore() {
  return typeof window === "undefined"
    ? null
    : createRoadmapOfflineStore(window.localStorage);
}
