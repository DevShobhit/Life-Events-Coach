"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roadmapQueryKeys } from "@/features/roadmap/query-keys";
import { apiClient } from "@/lib/api/client";
import type { AskResponse } from "@/lib/api/types";
import type { AskFormValues } from "./schema";

export function useAskSubmitMutation(userId: string, phaseId: string) {
  return useMutation<AskResponse, Error, AskFormValues>({
    mutationKey: ["ask", "submit", userId, phaseId],
    mutationFn: ({ question }) => apiClient.ask(userId, phaseId, question),
  });
}

export function useAskFoldMutation(userId: string, phaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["roadmap", "fold", userId, phaseId],
    mutationFn: (concernId: string) =>
      apiClient.fold(userId, phaseId, concernId, crypto.randomUUID()),
    onSuccess: (roadmap) => {
      queryClient.setQueryData(
        roadmapQueryKeys.detail(userId, phaseId),
        roadmap,
      );
    },
  });
}
