"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api/client";
import type { CardAction, RoadmapResponse } from "@/lib/api/types";

export function useRoadmap(userId: string, phaseId: string) {
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<CardAction | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        setRoadmap(await apiClient.roadmap(userId, phaseId, "arrived", signal));
      } catch (nextError) {
        if (
          nextError instanceof DOMException &&
          nextError.name === "AbortError"
        )
          return;
        setError(
          nextError instanceof Error
            ? nextError
            : new Error("Unable to load roadmap"),
        );
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
      setPendingAction(action);
      setError(null);
      try {
        const nextRoadmap = await apiClient.action(userId, phaseId, {
          concern_id: concernId,
          action,
          idempotency_key: crypto.randomUUID(),
        });
        setRoadmap(nextRoadmap);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError
            : new Error("Unable to update roadmap"),
        );
      } finally {
        setPendingAction(null);
      }
    },
    [phaseId, userId],
  );

  return { act, error, isLoading, load, pendingAction, roadmap };
}
