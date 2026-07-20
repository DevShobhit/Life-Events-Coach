"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api/client";
import type { CardAction, RoadmapResponse } from "@/lib/api/types";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import {
  getUserFacingError,
  shouldQueueRoadmapAction,
} from "@/lib/ux/feedback";

export function useRoadmap(userId: string, phaseId: string) {
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<CardAction | null>(null);
  const [isCached, setIsCached] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const nextRoadmap = await apiClient.roadmap(
          userId,
          phaseId,
          "arrived",
          signal,
        );
        browserRoadmapOfflineStore()?.write(userId, phaseId, nextRoadmap);
        setIsCached(false);
        setRoadmap(nextRoadmap);
      } catch (nextError) {
        if (
          nextError instanceof DOMException &&
          nextError.name === "AbortError"
        )
          return;
        const cachedRoadmap = browserRoadmapOfflineStore()?.read(
          userId,
          phaseId,
        );
        if (cachedRoadmap) {
          setRoadmap(cachedRoadmap);
          setIsCached(true);
        } else {
          setError(getUserFacingError(nextError));
        }
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [phaseId, userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const act = useCallback(
    async (concernId: string, action: CardAction) => {
      const idempotencyKey = crypto.randomUUID();
      setPendingAction(action);
      setError(null);
      setOfflineMessage(null);
      const previousRoadmap = roadmap;
      const optimisticRoadmap = roadmap
        ? {
            ...roadmap,
            now: roadmap.now.filter((card) => card.concern_id !== concernId),
          }
        : null;
      if (optimisticRoadmap) {
        optimisticRoadmap.current = optimisticRoadmap.now[0] ?? null;
        setRoadmap(optimisticRoadmap);
      }
      try {
        const nextRoadmap = await apiClient.action(userId, phaseId, {
          concern_id: concernId,
          action,
          idempotency_key: idempotencyKey,
        });
        browserRoadmapOfflineStore()?.write(userId, phaseId, nextRoadmap);
        setIsCached(false);
        setRoadmap(nextRoadmap);
      } catch (nextError) {
        if (shouldQueueRoadmapAction(nextError)) {
          browserRoadmapOfflineStore()?.enqueue({
            userId,
            phaseId,
            concernId,
            action,
            idempotencyKey,
          });
          if (optimisticRoadmap)
            browserRoadmapOfflineStore()?.write(
              userId,
              phaseId,
              optimisticRoadmap,
            );
          setOfflineMessage(
            "Saved on this device. We will sync the change when the connection returns.",
          );
        } else {
          setRoadmap(previousRoadmap);
          setError(getUserFacingError(nextError));
        }
      } finally {
        setPendingAction(null);
      }
    },
    [phaseId, roadmap, userId],
  );

  return {
    act,
    error,
    isCached,
    isLoading,
    load,
    offlineMessage,
    pendingAction,
    roadmap,
  };
}
