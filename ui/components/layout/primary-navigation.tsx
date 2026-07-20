import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "./navigation-config";
import { isNavigationItemActive } from "./navigation-config";

export function PrimaryNavigation({
  items,
  pathname,
}: {
  items: NavigationItem[];
  pathname: string;
}) {
  return (
    <nav
      aria-label="Primary navigation"
      className="hidden items-center gap-1 md:flex"
    >
      {items.map((item) => (
        <NavigationLink item={item} key={item.href} pathname={pathname} />
      ))}
    </nav>
  );
}

export function NavigationLink({
  compact = false,
  item,
  pathname,
}: {
  compact?: boolean;
  item: NavigationItem;
  pathname: string;
}) {
  const Icon = item.icon;
  const active = isNavigationItemActive(pathname, item.href);
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
