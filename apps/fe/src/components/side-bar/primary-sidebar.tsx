import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@dashboard/ui/components/tooltip";
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
  const helpHref = `/${activeOrganizationId}/help`;
  const pathname = useLocation().pathname;
  const isHelpActive = pathname.startsWith(helpHref);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="sticky top-0 hidden h-screen md:flex flex-col items-center w-16 shrink-0 bg-primary text-sidebar-primary-foreground py-4 gap-1 z-50 ">
        <div className="flex-1 flex flex-col items-center gap-1 w-full">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    preload={false}
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
                      active
                        ? "bg-white/20 text-sidebar-primary-foreground ring-1 ring-white/35 shadow-sm"
                        : "text-sidebar-primary-foreground/75 hover:bg-white/10 hover:text-sidebar-primary-foreground"
                    }`}
                  >
                    <item.icon className="size-5" />
                    <span className="mt-1 w-full truncate px-0.5 text-center text-[10px] leading-none font-medium">
                      {item.label}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={helpHref}
              preload={false}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
                isHelpActive
                  ? "bg-white/20 text-sidebar-primary-foreground ring-1 ring-white/35 shadow-sm"
                  : "text-sidebar-primary-foreground/75 hover:bg-white/10 hover:text-sidebar-primary-foreground"
              }`}
            >
              <CircleHelp className="size-5" />
              <span className="mt-1 w-full truncate px-0.5 text-center text-[10px] leading-none font-medium">
                Help
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Help
          </TooltipContent>
        </Tooltip>
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[#155dfc] text-sidebar-primary-foreground h-14 px-2">
      {navItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.label}
            to={item.href}
            preload={false}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              active
                ? "text-sidebar-primary-foreground"
                : "text-sidebar-primary-foreground/70 hover:text-sidebar-primary-foreground"
            }`}
          >
            <item.icon className="size-5" />
            <span className="mt-1 w-full truncate px-0.5 text-center text-[10px] leading-none font-medium">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
