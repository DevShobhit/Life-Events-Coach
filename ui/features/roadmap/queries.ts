"use client";

import { useQuery } from "@tanstack/react-query";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import { ROADMAP_QUERY_STALE_TIME_MS } from "@/lib/query/query-client";
import { getUserFacingError } from "@/lib/ux/feedback";
import { getRoadmap } from "./api";
import { roadmapQueryKeys } from "./query-keys";
import type { RoadmapResponse } from "./types";

export function roadmapQueryOptions(
  userId: string,
  phaseId: string,
  stage = "arrived",
) {
  return {
    queryKey: roadmapQueryKeys.detail(userId, phaseId, stage),
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      const roadmap = await getRoadmap(userId, phaseId, stage, signal);
      browserRoadmapOfflineStore()?.write(userId, phaseId, roadmap);
      return roadmap;
    },
    enabled: Boolean(userId.trim() && phaseId.trim() && stage.trim()),
    staleTime: ROADMAP_QUERY_STALE_TIME_MS,
    refetchOnReconnect: false,
    placeholderData: () =>
      browserRoadmapOfflineStore()?.read(userId, phaseId) ?? undefined,
    meta: { getUserFacingError },
  };
}

export function useRoadmapQuery(
  userId: string,
  phaseId: string,
  stage = "arrived",
) {
  return useQuery<RoadmapResponse>(roadmapQueryOptions(userId, phaseId, stage));
}
