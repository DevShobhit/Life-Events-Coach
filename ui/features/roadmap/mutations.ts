"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import {
  getUserFacingError,
  shouldQueueRoadmapAction,
} from "@/lib/ux/feedback";
import { submitRoadmapAction } from "./api";
import { roadmapQueryKeys } from "./query-keys";
import type { CardAction, RoadmapResponse } from "./types";

export const offlineQueuedMessage =
  "Saved on this device. We will sync the change when the connection returns.";

export function optimisticallyRemove(
  roadmap: RoadmapResponse | undefined,
  concernId: string,
) {
  if (!roadmap) return roadmap;
  const now = roadmap.now.filter((card) => card.concern_id !== concernId);
  return { ...roadmap, now, current: now[0] ?? null };
}

export function useRoadmapActionMutation(
  userId: string,
  phaseId: string,
  stage = "arrived",
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["roadmap", "action", userId, phaseId, stage],
    mutationFn: (input: {
      concernId: string;
      action: CardAction;
      idempotencyKey: string;
    }) => submitRoadmapAction(userId, phaseId, stage, input),
    onMutate: async (input) => {
      const queryKey = roadmapQueryKeys.detail(userId, phaseId, stage);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RoadmapResponse>(queryKey);
      queryClient.setQueryData(
        queryKey,
        optimisticallyRemove(previous, input.concernId),
      );
      return { previous, queryKey };
    },
    onSuccess: (roadmap, _input, context) => {
      browserRoadmapOfflineStore()?.write(userId, phaseId, stage, roadmap);
      queryClient.setQueryData(
        context?.queryKey ?? roadmapQueryKeys.detail(userId, phaseId, stage),
        roadmap,
      );
    },
    onError: (error, input, context) => {
      if (shouldQueueRoadmapAction(error)) {
        browserRoadmapOfflineStore()?.enqueue({
          userId,
          phaseId,
          stage,
          concernId: input.concernId,
          action: input.action,
          idempotencyKey: input.idempotencyKey,
        });
        if (!context) return;
        const optimistic = queryClient.getQueryData<RoadmapResponse>(
          context.queryKey,
        );
        if (optimistic)
          browserRoadmapOfflineStore()?.write(
            userId,
            phaseId,
            stage,
            optimistic,
          );
        return;
      }
      if (context) queryClient.setQueryData(context.queryKey, context.previous);
    },
  });
}

export function roadmapMutationError(error: unknown) {
  return shouldQueueRoadmapAction(error)
    ? offlineQueuedMessage
    : getUserFacingError(error);
}
