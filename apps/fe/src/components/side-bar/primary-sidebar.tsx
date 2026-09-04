import { RailNavItem } from "@/components/side-bar/rail-nav-item";
import { TooltipProvider } from "@dashboard/ui/components/tooltip";
import {
  settingsPathPrefixes,
  isSettingsPath,
} from "@/lib/helper/settings-nav";
import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, CircleHelp, Home, PlugZap, Settings } from "lucide-react";
import * as React from "react";

type PrimarySidebarProps = {
  activeOrganizationId: string;
};

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  // Settings spans several routes that were never moved under one prefix, so a
  // rail item can claim a list of them instead of a single subtree.
  matchPrefixes?: string[];
};

const BRAND_LOGO = "/branding/Icon/Refidly%20%5BIcon%5D%20-%20White%20No%20Bg.png";

function useNavItems(activeOrganizationId: string) {
  return React.useMemo<NavItem[]>(
    () => [
      {
        icon: Home,
        label: "Home",
        href: `/${activeOrganizationId}`,
        matchPrefixes: [`/${activeOrganizationId}`],
      },
      {
        icon: Calendar,
        label: "Calendar",
        href: `/${activeOrganizationId}/calendar`,
        matchPrefixes: [`/${activeOrganizationId}/calendar`],
      },
      {
        icon: PlugZap,
        label: "Apps",
        href: `/${activeOrganizationId}/integrations`,
        matchPrefixes: [`/${activeOrganizationId}/integrations`],
      },
      {
        icon: Settings,
        label: "Settings",
        // Personal settings are the one section no role or plan can refuse.
        href: `/${activeOrganizationId}/profile`,
        matchPrefixes: settingsPathPrefixes(activeOrganizationId),
      },
    ],
    [activeOrganizationId]
  );
}

function useIsActive(navItems: NavItem[], activeOrganizationId: string) {
  const location = useLocation();
  const pathname = location.pathname;
  const helpPrefix = `/${activeOrganizationId}/help`;

  return React.useCallback(
    (item: NavItem) => {
      if (item.label === "Home") {
        return (
          pathname === `/${activeOrganizationId}` ||
          (pathname.startsWith(`/${activeOrganizationId}/`) &&
            !pathname.startsWith(helpPrefix) &&
            !isSettingsPath(pathname, activeOrganizationId) &&
            !navItems.some(
              (other) =>
                other.label !== "Home" &&
                other.matchPrefixes?.some((prefix) =>
                  pathname.startsWith(prefix)
                )
            ))
        );
      }
      return (
        item.matchPrefixes?.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
        ) ?? false
      );
    },
    [pathname, activeOrganizationId, helpPrefix, navItems]
  );
}

export function PrimarySidebar({ activeOrganizationId }: PrimarySidebarProps) {
  const navItems = useNavItems(activeOrganizationId);
  const isActive = useIsActive(navItems, activeOrganizationId);
  const homeHref = `/${activeOrganizationId}`;
  const helpHref = `/${activeOrganizationId}/help`;
  const pathname = useLocation().pathname;

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="bg-brand-rail sticky top-0 z-50 hidden h-dvh w-16 shrink-0 flex-col items-center gap-1 py-4 md:flex">
        <Link to={homeHref} preload={false} className="mb-3">
          <img
            src={BRAND_LOGO}
            alt="Refidly"
            className="size-9 object-contain"
          />
        </Link>

        <nav
          aria-label="Primary"
          className="flex w-full flex-1 flex-col items-center gap-1"
        >
          {navItems.map((item) => (
            <RailNavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={isActive(item)}
            />
          ))}
        </nav>

        <RailNavItem
          icon={CircleHelp}
          label="Help"
          href={helpHref}
          active={pathname.startsWith(helpHref)}
        />
      </aside>
    </TooltipProvider>
  );
}

export function PrimaryBottomBar({
  activeOrganizationId,
}: PrimarySidebarProps) {
  const navItems = useNavItems(activeOrganizationId);
  const isActive = useIsActive(navItems, activeOrganizationId);

  return (
    <nav
      aria-label="Primary"
      className="bg-brand-rail-horizontal fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around px-2 md:hidden"
    >
      {navItems.map((item) => (
        <RailNavItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          href={item.href}
          surface="bar"
          active={isActive(item)}
        />
      ))}
    </nav>
  );
}
