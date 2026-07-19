"use client";

import { RouteError } from "@/components/route-states";

export default function GlobalError({
  reset,
}: {
  error: globalThis.Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError onRetry={reset} />;
}
