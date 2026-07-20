"use client";

import { MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { appNavigation } from "@/components/layout/navigation-config";
import { PrimaryNavigation } from "@/components/layout/primary-navigation";
import { OfflineSync } from "@/components/offline-sync";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/state/session";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useSessionStore((state) => state.reducedMotion);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion
      ? "true"
      : "false";
  }, [reducedMotion]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <OfflineSync />
      <header className="border-b border-border/70 bg-background/95">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-8">
          <Link
            className="text-sm font-medium tracking-wide text-primary"
            href="/now"
          >
            STEADY PATH
          </Link>
          <div className="flex items-center gap-2">
            <PrimaryNavigation items={appNavigation} pathname={pathname} />
            <Button
              aria-label="Ask about your path"
              className="min-h-11 gap-2"
              onClick={() => router.push("/now?ask=1")}
              variant="outline"
            >
              <MessageCircleQuestion aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Ask</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col pb-20 md:pb-0" id="main-content">
        {children}
      </div>

      <MobileNavigation items={appNavigation} pathname={pathname} />
    </div>
  );
}
