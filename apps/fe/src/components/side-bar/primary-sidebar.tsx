import { RailNavItem } from "@/components/side-bar/rail-nav-item";
import { TooltipProvider } from "@dashboard/ui/components/tooltip";
import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, CircleHelp, Home, PlugZap } from "lucide-react";
import * as React from "react";

type PrimarySidebarProps = {
  activeOrganizationId: string;
};

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  matchPrefix?: string;
};

const BRAND_LOGO = "/branding/Icon/Refidly%20%5BIcon%5D%20-%20White%20No%20Bg.png";

function useNavItems(activeOrganizationId: string) {
  return React.useMemo<NavItem[]>(
    () => [
      {
        icon: Home,
        label: "Home",
        href: `/${activeOrganizationId}`,
        matchPrefix: `/${activeOrganizationId}`,
      },
      {
        icon: Calendar,
        label: "Calendar",
        href: `/${activeOrganizationId}/calendar`,
        matchPrefix: `/${activeOrganizationId}/calendar`,
      },
      {
        icon: PlugZap,
        label: "Apps",
        href: `/${activeOrganizationId}/integrations`,
        matchPrefix: `/${activeOrganizationId}/integrations`,
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
            !navItems.some(
              (other) =>
                other.label !== "Home" &&
                other.matchPrefix &&
                pathname.startsWith(other.matchPrefix)
            ))
        );
      }
      return item.matchPrefix ? pathname.startsWith(item.matchPrefix) : false;
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
      <aside className="bg-brand-rail sticky top-0 z-50 hidden h-screen w-16 shrink-0 flex-col items-center gap-1 py-4 md:flex">
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
