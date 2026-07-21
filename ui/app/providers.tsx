"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SessionBootstrap } from "@/components/session-bootstrap";
import { logDevelopment } from "@/lib/logging/logger";
import { queryClient } from "@/lib/query/query-client";

export function Providers({ children }: { children: ReactNode }) {
  logDevelopment("ui_providers_rendered");
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap />
      {children}
    </QueryClientProvider>
  );
}
