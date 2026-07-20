"use client";

import { useEffect } from "react";
import { submitRoadmapAction } from "@/features/roadmap/api";
import { roadmapQueryKeys } from "@/features/roadmap/query-keys";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import { queryClient } from "@/lib/query/query-client";

export function OfflineSync() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js");

    const replay = async () => {
      const store = browserRoadmapOfflineStore();
      if (!store || !navigator.onLine) return;
      await store.replay(async (action) => {
        await submitRoadmapAction(action.userId, action.phaseId, {
          concernId: action.concernId,
          action: action.action,
          idempotencyKey: action.idempotencyKey,
        });
        await queryClient.invalidateQueries({
          queryKey: roadmapQueryKeys.detail(action.userId, action.phaseId),
        });
      });
    };

    void replay();
    window.addEventListener("online", replay);
    return () => window.removeEventListener("online", replay);
  }, []);

  return null;
}
