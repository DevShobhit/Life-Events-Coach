"use client";

import { useQuery } from "@tanstack/react-query";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";
import { getUserFacingError } from "@/lib/ux/feedback";
import { getRoadmap } from "./api";
import { roadmapQueryKeys } from "./query-keys";
import type { RoadmapResponse } from "./types";

export function useRoadmapQuery(userId: string, phaseId: string) {
  return useQuery<RoadmapResponse>({
    queryKey: roadmapQueryKeys.detail(userId, phaseId),
    queryFn: async ({ signal }) => {
      const roadmap = await getRoadmap(userId, phaseId, signal);
      browserRoadmapOfflineStore()?.write(userId, phaseId, roadmap);
      return roadmap;
    },
    enabled: Boolean(userId && phaseId),
    placeholderData: () =>
      browserRoadmapOfflineStore()?.read(userId, phaseId) ?? undefined,
    meta: { getUserFacingError },
  });
}
