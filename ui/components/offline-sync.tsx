"use client";

import { useEffect } from "react";
import { submitRoadmapAction } from "@/features/roadmap/api";
import { roadmapQueryKeys } from "@/features/roadmap/query-keys";
import { logDevelopment } from "@/lib/logging/logger";
import {
  replayQueuedRoadmapActions,
  toRoadmapActionPayload,
} from "@/lib/offline/replay-roadmap-actions";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import { queryClient } from "@/lib/query/query-client";

export function OfflineSync() {
  useEffect(() => {
    let disposed = false;
    let cleanupRegistration = () => {};
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
          const handleUpdateFound = () => {
            logDevelopment("service_worker.update_available");
          };
          const handleControllerChange = () => {
            logDevelopment("service_worker.controller_changed", {
              controlled: Boolean(navigator.serviceWorker.controller),
            });
          };
          registration.addEventListener("updatefound", handleUpdateFound);
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            handleControllerChange,
          );
          cleanupRegistration = () => {
            registration.removeEventListener("updatefound", handleUpdateFound);
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              handleControllerChange,
            );
          };
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
            action.stage,
            toRoadmapActionPayload(action),
          ).then(() => undefined),
        refresh: (userId, phaseId, stage) =>
          queryClient.invalidateQueries({
            queryKey: roadmapQueryKeys.detail(userId, phaseId, stage),
          }),
      });
    };

    void replay();
    window.addEventListener("online", replay);
    return () => {
      disposed = true;
      cleanupRegistration();
      window.removeEventListener("online", replay);
    };
  }, []);

  return null;
}
