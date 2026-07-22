"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublishedPhases } from "./api";
import { phaseQueryKeys } from "./query-keys";

export function usePublishedPhasesQuery() {
  return useQuery({
    queryKey: phaseQueryKeys.catalog(),
    queryFn: ({ signal }) => getPublishedPhases(signal),
  });
}
