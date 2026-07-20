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
      logDevelopment("service_worker.registration.started");
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          if (disposed) return;
          logDevelopment("service_worker.registration.completed", {
            scope: registration.scope,
            state: registration.active?.state ?? registration.installing?.state,
          });
          const handleUpdateFound = () => {
            logDevelopment("service_worker.update.available");
          };
          const worker =
            registration.installing ?? registration.waiting ?? registration.active;
          const handleStateChange = () => {
            logDevelopment("service_worker.state.changed", {
              state: worker?.state ?? "unknown",
            });
          };
          const handleControllerChange = () => {
            logDevelopment("service_worker.controller.changed", {
              controlled: Boolean(navigator.serviceWorker.controller),
            });
          };
          registration.addEventListener("updatefound", handleUpdateFound);
          worker?.addEventListener("statechange", handleStateChange);
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            handleControllerChange,
          );
          cleanupRegistration = () => {
            registration.removeEventListener("updatefound", handleUpdateFound);
            worker?.removeEventListener("statechange", handleStateChange);
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              handleControllerChange,
            );
          };
        })
        .catch((error: unknown) => {
          logDevelopment("service_worker.registration.failed", {
            errorType: error instanceof Error ? error.name : "unknown",
          });
        });
    } else {
      logDevelopment("service_worker.registration.skipped", {
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

    const replayWithDiagnostics = () => {
      void replay().catch((error: unknown) => {
        logDevelopment("offline.replay.failed", {
          errorType: error instanceof Error ? error.name : "unknown",
        });
      });
    };

    replayWithDiagnostics();
    window.addEventListener("online", replayWithDiagnostics);
    return () => {
      disposed = true;
      cleanupRegistration();
      window.removeEventListener("online", replayWithDiagnostics);
    };
  }, []);

  return null;
}
