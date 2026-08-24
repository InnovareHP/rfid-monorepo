import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dashboard/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@dashboard/ui/components/sidebar";
import { cn } from "@dashboard/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import * as React from "react";

type NavLeafItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

type NavSubItem = NavLeafItem & {
  // A third level expands in place under its row rather than in a floating
  // panel; the row keeps its own link and the chevron toggles the children.
  items?: NavLeafItem[];
};

type NavItem = {
  title: string;
  url?: string;
  icon?: LucideIcon;
  items?: NavSubItem[];
};

// A nav url owns its subtree, so /master-list stays lit on /master-list/leads/x.
// The org root is only ever an exact match, or it would light up on every page.
function matchesPath(pathname: string, url: string) {
  if (pathname === url) return true;
  return url.split("/").length > 2 && pathname.startsWith(`${url}/`);
}

// Drives auto-open only: a group counts as containing the route when any row or
// nested row under it matches. Highlighting stays on the current page's row.
function subItemIsActive(pathname: string, subItem: NavSubItem) {
  return (
    matchesPath(pathname, subItem.url) ||
    (subItem.items?.some((child) => matchesPath(pathname, child.url)) ?? false)
  );
}

function collectUrls(items: NavItem[]) {
  return items.flatMap((item) => [
    ...(item.url ? [item.url] : []),
    ...(item.items ?? []).flatMap((subItem) => [
      subItem.url,
      ...(subItem.items ?? []).map((child) => child.url),
    ]),
  ]);
}

// Only the deepest matching url lights up. One row's url can be an ancestor of
// another's (/analytics/custom vs /analytics/custom/dashboards), and subtree
// matching alone would light both rows on the deeper page.
function findActiveUrl(pathname: string, items: NavItem[]) {
  return collectUrls(items)
    .filter((url) => matchesPath(pathname, url))
    .reduce<string | null>(
      (best, url) => (best && best.length >= url.length ? best : url),
      null
    );
}

export const NavMain = React.memo(function NavMain({
  items,
}: {
  items: NavItem[];
}) {
  const location = useLocation();
  const { setOpen } = useSidebar();
  const pathname = location.pathname;
  const { state, isMobile } = useSidebar();
  // Only explicit toggles are stored; the open state itself is derived below, so
  // collapsing a group you are inside sticks instead of springing back open.
  const [openOverrides, setOpenOverrides] = React.useState<
    Record<string, boolean>
  >({});
  const activeUrl = React.useMemo(
    () => findActiveUrl(pathname, items),
    [pathname, items]
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.url === activeUrl}
                  onClick={() => setOpen(true)}
                  asChild
                >
                  <Link preload="intent" to={item.url || "#"}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          const hasActiveChild = item.items.some((subItem) =>
            subItemIsActive(pathname, subItem)
          );

          if (state === "collapsed" && !isMobile) {
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton isActive={hasActiveChild}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="right"
                    align="start"
                    className="min-w-44"
                  >
                    <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {item.items?.map((subItem) => (
                      <React.Fragment key={subItem.title}>
                        <DropdownMenuItem
                          asChild
                          className={cn(
                            "border border-transparent transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground hover:border-border/80",
                            subItem.url === activeUrl &&
                              "bg-accent text-accent-foreground border-border/80"
                          )}
                        >
                          <Link preload="intent" to={subItem.url}>
                            {subItem.icon && <subItem.icon />}
                            {subItem.title}
                          </Link>
                        </DropdownMenuItem>

                        {/* Collapsed, there is no row to hang a nested dropdown
                            off, so a third level indents inside this one. */}
                        {subItem.items?.map((child) => (
                          <DropdownMenuItem
                            key={child.title}
                            asChild
                            className={cn(
                              "border border-transparent pl-6 transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground hover:border-border/80",
                              child.url === activeUrl &&
                                "bg-accent text-accent-foreground border-border/80"
                            )}
                          >
                            <Link preload="intent" to={child.url}>
                              {child.icon && <child.icon />}
                              {child.title}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          }

          const open = openOverrides[item.title] ?? hasActiveChild;

          return (
            <Collapsible
              key={item.title}
              asChild
              open={open}
              onOpenChange={(next) =>
                setOpenOverrides((previous) => ({
                  ...previous,
                  [item.title]: next,
                }))
              }
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const subKey = `${item.title}/${subItem.title}`;
                      const subHasActiveChild =
                        subItem.items?.some((child) =>
                          matchesPath(pathname, child.url)
                        ) ?? false;
                      const subOpen =
                        openOverrides[subKey] ?? subHasActiveChild;

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            isActive={subItem.url === activeUrl}
                            className={cn(subItem.items?.length && "pr-8")}
                            asChild
                          >
                            <Link preload="intent" to={subItem.url}>
                              {subItem.icon && <subItem.icon />}
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>

                          {subItem.items?.length ? (
                            <Collapsible
                              open={subOpen}
                              onOpenChange={(next) =>
                                setOpenOverrides((previous) => ({
                                  ...previous,
                                  [subKey]: next,
                                }))
                              }
                              className="group/sub-collapsible"
                            >
                              <CollapsibleTrigger asChild>
                                <SidebarMenuAction
                                  aria-label={`Toggle ${subItem.title}`}
                                >
                                  <ChevronRight className="transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
                                </SidebarMenuAction>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {subItem.items.map((child) => (
                                    <SidebarMenuSubItem key={child.title}>
                                      <SidebarMenuSubButton
                                        size="sm"
                                        isActive={child.url === activeUrl}
                                        asChild
                                      >
                                        <Link preload="intent" to={child.url}>
                                          {child.icon && <child.icon />}
                                          <span>{child.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </Collapsible>
                          ) : null}
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
});
