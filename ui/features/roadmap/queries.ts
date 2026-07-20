"use client";

import { useQuery } from "@tanstack/react-query";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import { logDevelopment } from "@/lib/logging/logger";
import { ROADMAP_QUERY_STALE_TIME_MS } from "@/lib/query/query-client";
import { getUserFacingError } from "@/lib/ux/feedback";
import { getRoadmap } from "./api";
import { roadmapQueryKeys } from "./query-keys";
import type { RoadmapResponse } from "./types";

type RoadmapOfflineWriter = {
  write: (
    userId: string,
    phaseId: string,
    stage: string,
    roadmap: RoadmapResponse,
  ) => void;
};

type RoadmapOfflineReader = {
  read: (
    userId: string,
    phaseId: string,
    stage: string,
  ) => RoadmapResponse | null;
};

export function loadRoadmapOffline(
  store: RoadmapOfflineReader | null | undefined,
  userId: string,
  phaseId: string,
  stage: string,
) {
  if (!store) return undefined;
  try {
    return store.read(userId, phaseId, stage) ?? undefined;
  } catch (error) {
    logDevelopment("roadmap.cache.read.failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return undefined;
  }
}

export function persistRoadmapOffline(
  store: RoadmapOfflineWriter | null | undefined,
  userId: string,
  phaseId: string,
  stage: string,
  roadmap: RoadmapResponse,
) {
  if (!store) return;
  try {
    store.write(userId, phaseId, stage, roadmap);
  } catch (error) {
    logDevelopment("roadmap.cache.write.failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
  }
}

export function roadmapQueryOptions(
  userId: string,
  phaseId: string,
  stage = "arrived",
) {
  return {
    queryKey: roadmapQueryKeys.detail(userId, phaseId, stage),
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      logDevelopment("roadmap.query.started");
      try {
        const roadmap = await getRoadmap(userId, phaseId, stage, signal);
        persistRoadmapOffline(
          safeBrowserRoadmapOfflineStore(),
          userId,
          phaseId,
          stage,
          roadmap,
        );
        logDevelopment("roadmap.query.completed", {
          hasCurrent: Boolean(roadmap.current),
          nowCount: roadmap.now.length,
          horizonGroupCount: roadmap.horizon.length,
        });
        return roadmap;
      } catch (error) {
        logDevelopment("roadmap.query.failed", {
          errorType: error instanceof Error ? error.name : "unknown",
          errorCode:
            typeof error === "object" && error !== null && "code" in error
              ? error.code
              : "unknown",
        });
        throw error;
      }
    },
    enabled: Boolean(userId.trim() && phaseId.trim() && stage.trim()),
    staleTime: ROADMAP_QUERY_STALE_TIME_MS,
    refetchOnReconnect: false,
    placeholderData: () =>
      loadRoadmapOffline(
        safeBrowserRoadmapOfflineStore(),
        userId,
        phaseId,
        stage,
      ),
    meta: { getUserFacingError },
  };
}

function safeBrowserRoadmapOfflineStore() {
  try {
    return browserRoadmapOfflineStore();
  } catch (error) {
    logDevelopment("roadmap.cache.open.failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

export function useRoadmapQuery(
  userId: string,
  phaseId: string,
  stage = "arrived",
) {
  return useQuery<RoadmapResponse>(roadmapQueryOptions(userId, phaseId, stage));
}
