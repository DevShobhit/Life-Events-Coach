import type { CardAction } from "@/lib/api/types";
import type { QueuedAction } from "./roadmap-cache";

type ReplayInput = {
  replay: (execute: (action: QueuedAction) => Promise<void>) => Promise<void>;
  submit: (action: QueuedAction) => Promise<unknown>;
  refresh: (userId: string, phaseId: string) => Promise<void>;
};

export async function replayQueuedRoadmapActions({
  replay,
  submit,
  refresh,
}: ReplayInput) {
  const affectedRoadmaps = new Map<
    string,
    Pick<QueuedAction, "userId" | "phaseId">
  >();

  const replayAction = async (action: QueuedAction) => {
    await submit(action);
    affectedRoadmaps.set(roadmapKey(action), {
      userId: action.userId,
      phaseId: action.phaseId,
    });
  };

  await replay(replayAction);

  for (const roadmap of affectedRoadmaps.values()) {
    await refresh(roadmap.userId, roadmap.phaseId);
  }
}

function roadmapKey(action: Pick<QueuedAction, "userId" | "phaseId">) {
  return `${action.userId}:${action.phaseId}`;
}

export function toRoadmapActionPayload(action: QueuedAction): {
  concernId: string;
  action: CardAction;
  idempotencyKey: string;
} {
  return {
    concernId: action.concernId,
    action: action.action,
    idempotencyKey: action.idempotencyKey,
  };
}
