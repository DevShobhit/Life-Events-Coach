import { apiClient } from "@/lib/api/client";
import type { CardAction, RoadmapResponse } from "./types";

export function getRoadmap(
  userId: string,
  phaseId: string,
  stage = "arrived",
  signal?: AbortSignal,
) {
  return apiClient.roadmap(userId, phaseId, stage, signal);
}

export function submitRoadmapAction(
  userId: string,
  phaseId: string,
  stage: string,
  input: { concernId: string; action: CardAction; idempotencyKey: string },
  signal?: AbortSignal,
): Promise<RoadmapResponse> {
  return apiClient.action(
    userId,
    phaseId,
    {
      concern_id: input.concernId,
      action: input.action,
      stage,
      idempotency_key: input.idempotencyKey,
    },
    signal,
  );
}
