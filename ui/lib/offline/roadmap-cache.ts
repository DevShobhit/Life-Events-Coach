import type { CardAction, RoadmapResponse } from "@/lib/api/types";

export type QueuedAction = {
  userId: string;
  phaseId: string;
  stage: string;
  concernId: string;
  action: CardAction;
  idempotencyKey: string;
};

const queuedActions = new Set<CardAction>([
  "done",
  "skip",
  "already_handled",
  "relevant",
  "not_relevant",
]);

function roadmapStorageKey(
  keyPrefix: string,
  userId: string,
  phaseId: string,
  stage: string,
) {
  return `${keyPrefix}:roadmap:${JSON.stringify([userId, phaseId, stage])}`;
}

function normalizeQueuedAction(value: unknown): QueuedAction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const requiredStrings = ["userId", "phaseId", "concernId", "idempotencyKey"];
  if (
    requiredStrings.some(
      (field) =>
        typeof candidate[field] !== "string" || candidate[field].length === 0,
    )
  ) {
    return null;
  }
  const stageValue = candidate.stage ?? "arrived";
  if (typeof stageValue !== "string") return null;
  const stage = stageValue.trim();
  if (!stage) return null;
  if (
    typeof candidate.action !== "string" ||
    !queuedActions.has(candidate.action as CardAction)
  ) {
    return null;
  }
  return {
    userId: candidate.userId as string,
    phaseId: candidate.phaseId as string,
    stage,
    concernId: candidate.concernId as string,
    action: candidate.action as CardAction,
    idempotencyKey: candidate.idempotencyKey as string,
  };
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem"> &
  Partial<Pick<Storage, "length" | "key">>;

export function createRoadmapOfflineStore(
  storage: StorageLike,
  keyPrefix = "livecoach",
) {
  const roadmapKey = (userId: string, phaseId: string, stage: string) =>
    roadmapStorageKey(keyPrefix, userId, phaseId, stage);
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
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("invalid queue");
        const normalized = parsed.flatMap((value) => {
          const action = normalizeQueuedAction(value);
          return action ? [action] : [];
        });
        if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
          storage.setItem(queueKey, JSON.stringify(normalized));
        }
        return normalized;
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
    clearUser(userId: string) {
      const actions = this.queued().filter(
        (action) => action.userId !== userId,
      );
      storage.setItem(queueKey, JSON.stringify(actions));
      if (!storage.length || !storage.key) return;
      const keysToRemove: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key?.startsWith(`${keyPrefix}:roadmap:`)) continue;
        try {
          const identity = JSON.parse(
            key.slice(`${keyPrefix}:roadmap:`.length),
          );
          if (Array.isArray(identity) && identity[0] === userId) {
            keysToRemove.push(key);
          }
        } catch {
          // Ignore unrelated or malformed application keys.
        }
      }
      for (const key of keysToRemove) storage.removeItem(key);
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
