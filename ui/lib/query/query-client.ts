import { QueryClient } from "@tanstack/react-query";

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
      retry: (failureCount, error) =>
        failureCount < 2 && isTransientQueryError(error),
    },
    mutations: { retry: false },
  },
});
