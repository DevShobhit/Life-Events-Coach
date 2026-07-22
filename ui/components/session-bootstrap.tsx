"use client";

import { useEffect } from "react";
import {
  getConfiguredSessionAdapter,
  useSessionStore,
} from "@/lib/state/session";

export function SessionBootstrap() {
  useEffect(() => {
    const adapter = getConfiguredSessionAdapter();
    if (!adapter) return;
    return adapter.subscribe((session) => {
      if (session) {
        useSessionStore.getState().setAuthenticatedSession(session);
      } else {
        useSessionStore.getState().clearAuthenticatedSession();
      }
    });
  }, []);

  return null;
}
