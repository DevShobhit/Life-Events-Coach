"use client";

import { useEffect } from "react";
import { submitRoadmapAction } from "@/features/roadmap/api";
import { roadmapQueryKeys } from "@/features/roadmap/query-keys";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import {
  replayQueuedRoadmapActions,
  toRoadmapActionPayload,
} from "@/lib/offline/replay-roadmap-actions";
import { queryClient } from "@/lib/query/query-client";

export function OfflineSync() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js");

    const replay = async () => {
      const store = browserRoadmapOfflineStore();
      if (!store || !navigator.onLine) return;
      await replayQueuedRoadmapActions({
        replay: (execute) => store.replay(execute).then(() => undefined),
        submit: (action) =>
          submitRoadmapAction(
            action.userId,
            action.phaseId,
            toRoadmapActionPayload(action),
          ).then(() => undefined),
        refresh: (userId, phaseId) =>
          queryClient.invalidateQueries({
            queryKey: roadmapQueryKeys.detail(userId, phaseId),
          }),
      });
    };

    void replay();
    window.addEventListener("online", replay);
    return () => window.removeEventListener("online", replay);
  }, []);

  return null;
}
