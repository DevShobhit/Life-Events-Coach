import { QueryClient } from "@tanstack/react-query";

export const ROADMAP_QUERY_STALE_TIME_MS = 30_000;

export function isTransientQueryError(error: unknown): boolean {
  const status =
    error instanceof Error && "status" in error ? error.status : undefined;
  return (
    status === 408 ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnReconnect: false,
      retry: (failureCount, error) =>
        failureCount < 2 && isTransientQueryError(error),
    },
    mutations: { retry: false },
  },
});
