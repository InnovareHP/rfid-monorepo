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

export type NavLeafItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

// A row that opens something in place instead of navigating. It carries no url,
// so it is not a destination and global search leaves it alone.
export type NavActionItem = {
  title: string;
  onSelect: () => void;
  icon?: LucideIcon;
};

export type NavSubItem = Omit<NavLeafItem, "url"> & {
  // A folder is a label with no page behind it, so the row itself toggles the
  // children. Anything with a url keeps its link and the chevron beside it.
  url?: string;
  onSelect?: () => void;
  // A third level expands in place under its row rather than in a floating
  // panel; the row keeps its own link and the chevron toggles the children.
  items?: NavLeafItem[];
};

export type NavItem = {
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

// Drives auto-open only: a group contains the route when the row that actually
// lights up is one of its own. Subtree matching opened every group whose url is
// an ancestor too, so a dashboard under /analytics/custom/dashboards sprang the
// Reports group open alongside Overview.
function subItemIsActive(activeUrl: string | null, subItem: NavSubItem) {
  if (!activeUrl) return false;

  return (
    subItem.url === activeUrl ||
    (subItem.items?.some((child) => child.url === activeUrl) ?? false)
  );
}

function collectUrls(items: NavItem[]) {
  return items.flatMap((item) => [
    ...(item.url ? [item.url] : []),
    ...(item.items ?? []).flatMap((subItem) => [
      // A folder row has no url of its own.
      ...(subItem.url ? [subItem.url] : []),
      ...(subItem.items ?? []).flatMap((child) =>
        child.url ? [child.url] : []
      ),
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
            subItemIsActive(activeUrl, subItem)
          );

          if (state === "collapsed" && !isMobile) {
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={hasActiveChild}
                    >
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
                        {subItem.onSelect ? (
                          <DropdownMenuItem
                            onSelect={subItem.onSelect}
                            className="border border-transparent transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground hover:border-border/80"
                          >
                            {subItem.icon && <subItem.icon />}
                            {subItem.title}
                          </DropdownMenuItem>
                        ) : subItem.url ? (
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
                        ) : (
                          <DropdownMenuLabel className="text-muted-foreground">
                            {subItem.title}
                          </DropdownMenuLabel>
                        )}

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
                        subItem.items?.some(
                          (child) => child.url && matchesPath(pathname, child.url)
                        ) ?? false;
                      const subOpen =
                        openOverrides[subKey] ?? subHasActiveChild;

                      const children = subItem.items ?? [];

                      const linkRow = subItem.onSelect ? (
                        <SidebarMenuSubButton
                          className="cursor-pointer"
                          onClick={subItem.onSelect}
                        >
                          {subItem.icon && <subItem.icon />}
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      ) : subItem.url ? (
                        <SidebarMenuSubButton
                          isActive={subItem.url === activeUrl}
                          className={cn(children.length && "pr-8")}
                          asChild
                        >
                          <Link preload="intent" to={subItem.url}>
                            {subItem.icon && <subItem.icon />}
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      ) : null;

                      if (children.length === 0) {
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            {linkRow}
                          </SidebarMenuSubItem>
                        );
                      }

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
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
                            {/* A folder has nowhere to navigate, so the row is
                                the toggle; a row with a page keeps its link and
                                the chevron sits beside it. */}
                            {subItem.url ? (
                              <>
                                {linkRow}
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuAction
                                    aria-label={`Toggle ${subItem.title}`}
                                  >
                                    <ChevronRight className="transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
                                  </SidebarMenuAction>
                                </CollapsibleTrigger>
                              </>
                            ) : (
                              <CollapsibleTrigger asChild>
                                <SidebarMenuSubButton className="cursor-pointer">
                                  {subItem.icon && <subItem.icon />}
                                  <span>{subItem.title}</span>
                                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
                                </SidebarMenuSubButton>
                              </CollapsibleTrigger>
                            )}

                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {children.map((child) => (
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
