import { apiClient } from "@/lib/api/client";

export function getPublishedPhases(signal?: AbortSignal) {
  return apiClient.phases(signal);
}
