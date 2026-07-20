"use client";

import { useEffect } from "react";
import { submitRoadmapAction } from "@/features/roadmap/api";
import { roadmapQueryKeys } from "@/features/roadmap/query-keys";
import {
  replayQueuedRoadmapActions,
  toRoadmapActionPayload,
} from "@/lib/offline/replay-roadmap-actions";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import { queryClient } from "@/lib/query/query-client";
import { logDevelopment } from "@/lib/logging/logger";

export function OfflineSync() {
  useEffect(() => {
    let disposed = false;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      logDevelopment("service_worker.registration_started");
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          if (disposed) return;
          logDevelopment("service_worker.registration_completed", {
            scope: registration.scope,
            state: registration.active?.state ?? registration.installing?.state,
          });
          registration.addEventListener("updatefound", () => {
            logDevelopment("service_worker.update_available");
          });
        })
        .catch((error: unknown) => {
          logDevelopment("service_worker.registration_failed", {
            errorType: error instanceof Error ? error.name : "unknown",
          });
        });
    } else {
      logDevelopment("service_worker.registration_skipped", {
        enabled: "serviceWorker" in navigator,
        environment: process.env.NODE_ENV,
      });
    }

    const replay = async () => {
      const store = browserRoadmapOfflineStore();
      if (!store || !navigator.onLine) return;
      await replayQueuedRoadmapActions({
        replay: (execute) => store.replay(execute).then(() => undefined),
        submit: (action) =>
          submitRoadmapAction(
            action.userId,
            action.phaseId,
            "arrived",
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
    return () => {
      disposed = true;
      window.removeEventListener("online", replay);
    };
  }, []);

  return null;
}
