"use client";

import { RouteError } from "@/components/route-states";
import { logDevelopment } from "@/lib/logging/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: globalThis.Error & { digest?: string };
  reset: () => void;
}) {
  logDevelopment("global_route_error_rendered", {
    digest: error.digest,
    errorName: error.name,
  });
  return <RouteError onRetry={reset} />;
}
