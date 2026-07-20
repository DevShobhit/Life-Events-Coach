"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryClient } from "@/lib/query/query-client";
import { logDevelopment } from "@/lib/logging/logger";

export function Providers({ children }: { children: ReactNode }) {
  logDevelopment("ui_providers_rendered");
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
