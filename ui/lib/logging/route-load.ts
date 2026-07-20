"use client";

import { useEffect, useRef } from "react";
import { logDevelopment } from "./logger";

type RouteLoadState = {
  enabled: boolean;
  isLoading: boolean;
  hasData: boolean;
  error?: unknown;
};

export function useRouteLoadLogging(
  route: "now" | "horizon",
  state: RouteLoadState,
) {
  const started = useRef(false);
  const terminalState = useRef<"completed" | "failed" | null>(null);

  useEffect(() => {
    if (!state.enabled || started.current) return;
    started.current = true;
    logDevelopment("route.load.started", { route });
  }, [route, state.enabled]);

  useEffect(() => {
    if (!state.enabled || state.isLoading || terminalState.current) return;
    if (state.error && !state.hasData) {
      terminalState.current = "failed";
      logDevelopment("route.load.failed", {
        route,
        errorType: state.error instanceof Error ? state.error.name : "unknown",
        errorCode: readErrorCode(state.error),
      });
      return;
    }
    if (state.hasData) {
      terminalState.current = "completed";
      logDevelopment("route.load.completed", { route });
    }
  }, [route, state.enabled, state.error, state.hasData, state.isLoading]);
}

function readErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "unknown";
  }
  const code = error.code;
  return typeof code === "string" ? code : "unknown";
}
