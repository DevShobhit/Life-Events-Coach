"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useEnrollmentQuery(userId: string, phaseId: string) {
  return useQuery({
    queryKey: ["enrollment", "detail", userId, phaseId],
    queryFn: ({ signal }) => apiClient.enrollment(userId, phaseId, signal),
    enabled: Boolean(userId && phaseId),
  });
}
