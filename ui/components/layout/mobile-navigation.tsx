import type { NavigationItem } from "./navigation-config";
import { NavigationLink } from "./primary-navigation";

export function MobileNavigation({
  items,
  pathname,
}: {
  items: NavigationItem[];
  pathname: string;
}) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-3 px-2">
        {items.map((item) => (
          <NavigationLink
            compact
            item={item}
            key={item.href}
            pathname={pathname}
          />
        ))}
      </div>
    </nav>
  );
}
