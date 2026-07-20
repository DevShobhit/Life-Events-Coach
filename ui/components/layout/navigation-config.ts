import { Compass, House, type LucideIcon, Settings } from "lucide-react";

export type NavigationItem = {
  href: "/now" | "/horizon" | "/settings";
  label: string;
  icon: LucideIcon;
};

export const appNavigation: NavigationItem[] = [
  { href: "/now", label: "Now", icon: House },
  { href: "/horizon", label: "Horizon", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
