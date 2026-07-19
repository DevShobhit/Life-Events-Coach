"use client";

import { Compass, House, MessageCircleQuestion, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { OfflineSync } from "@/components/offline-sync";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/now", label: "Now", icon: House },
  { href: "/horizon", label: "Horizon", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-1 md:flex"
            >
              {navigation.map((item) => (
                <NavLink item={item} key={item.href} pathname={pathname} />
              ))}
            </nav>
            <Button
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

      <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 px-2">
          {navigation.map((item) => (
            <NavLink item={item} key={item.href} pathname={pathname} compact />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  compact = false,
  item,
  pathname,
}: {
  compact?: boolean;
  item: (typeof navigation)[number];
  pathname: string;
}) {
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active && "bg-accent text-accent-foreground",
        compact && "m-1 flex-col gap-1 px-2 text-xs",
      )}
      href={item.href}
    >
      <Icon aria-hidden="true" className="size-4" />
      {item.label}
    </Link>
  );
}
