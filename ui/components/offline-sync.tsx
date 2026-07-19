"use client";

import { useEffect } from "react";

import { apiClient } from "@/lib/api/client";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";

export function OfflineSync() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js");

    const replay = async () => {
      const store = browserRoadmapOfflineStore();
      if (!store || !navigator.onLine) return;
      await store.replay(async (action) => {
        await apiClient.action(action.userId, action.phaseId, {
          concern_id: action.concernId,
          action: action.action,
          idempotency_key: action.idempotencyKey,
        });
      });
    };

    void replay();
    window.addEventListener("online", replay);
    return () => window.removeEventListener("online", replay);
  }, []);

  return null;
}
