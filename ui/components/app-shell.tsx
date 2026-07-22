"use client";

import { MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { appNavigation } from "@/components/layout/navigation-config";
import { PrimaryNavigation } from "@/components/layout/primary-navigation";
import { Logo } from "@/components/logo";
import { OfflineSync } from "@/components/offline-sync";
import { PhaseSwitcher } from "@/features/enrollment/components/phase-switcher";
import { useSessionStore } from "@/lib/state/session";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useSessionStore((state) => state.reducedMotion);
  const developmentUserId = useSessionStore((state) => state.developmentUserId);

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
          <Link aria-label="LiveCoach home" href="/now">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <PrimaryNavigation items={appNavigation} pathname={pathname} />
            <PhaseSwitcher userId={developmentUserId} />
            <Link
              aria-label="Ask about your path"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href="/now?ask=1"
            >
              <MessageCircleQuestion aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Ask</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>

      <MobileNavigation items={appNavigation} pathname={pathname} />
    </div>
  );
}
