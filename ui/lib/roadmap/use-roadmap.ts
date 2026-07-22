"use client";

import { useCallback, useState } from "react";
import {
  offlineQueuedMessage,
  useRoadmapActionMutation,
} from "@/features/roadmap/mutations";
import { useRoadmapQuery } from "@/features/roadmap/queries";
import type { CardAction } from "@/lib/api/types";
import {
  getUserFacingError,
  shouldQueueRoadmapAction,
} from "@/lib/ux/feedback";

/** Compatibility facade while route files migrate to focused roadmap hooks. */
export function useRoadmap(userId: string, phaseId: string) {
  const query = useRoadmapQuery(userId, phaseId);
  const mutation = useRoadmapActionMutation(userId, phaseId);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setOfflineMessage(null);
    await query.refetch();
  }, [query]);

  const act = useCallback(
    async (concernId: string, action: CardAction) => {
      setOfflineMessage(null);
      try {
        await mutation.mutateAsync({
          concernId,
          action,
          idempotencyKey: crypto.randomUUID(),
        });
      } catch (error) {
        if (shouldQueueRoadmapAction(error))
          setOfflineMessage(offlineQueuedMessage);
      }
    },
    [mutation],
  );

  return {
    act,
    error: query.error
      ? getUserFacingError(query.error)
      : mutation.error && !shouldQueueRoadmapAction(mutation.error)
        ? getUserFacingError(mutation.error)
        : null,
    isCached: Boolean(query.data && query.isPlaceholderData),
    isLoading: query.isLoading,
    load,
    offlineMessage,
    pendingAction: mutation.isPending
      ? (mutation.variables?.action ?? null)
      : null,
    roadmap: query.data ?? null,
  };
}
