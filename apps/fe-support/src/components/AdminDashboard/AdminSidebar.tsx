import { authClient, useSession } from "@/lib/auth-client";
import { ROLES } from "@/lib/contant";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@dashboard/ui/components/sidebar";
import { cn } from "@dashboard/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronsUpDown,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Shield,
  Star,
  Ticket,
  User,
  Users,
} from "lucide-react";
import * as React from "react";

const QUEUE_BOARD_URL = "/api/queues";

const LOGO_WORDMARK = "/branding/Wordmark/refidly-wordmark-colored.png";
const LOGO_ICON = "/branding/Icon/refidly-icon-colored.png";

type NavItem = {
  id: string;
  title: string;
  icon: React.ElementType;
  path: string;
  // Set on a landing page that other items nest under, so it lights up only on
  // an exact match rather than for every child route.
  exact?: boolean;
};

const SUPER_ADMIN_NAV: NavItem[] = [
  {
    id: "overview",
    title: "Overview",
    icon: LayoutDashboard,
    path: "/admin",
    exact: true,
  },
  {
    id: "user-management",
    title: "User Management",
    icon: Users,
    path: "/admin/users",
  },
  {
    id: "organizations",
    title: "Organizations",
    icon: Building2,
    path: "/admin/organizations",
  },
  {
    id: "activity-log",
    title: "Activity Log",
    icon: ClipboardList,
    path: "/admin/activity-log",
  },
  { id: "tickets", title: "Tickets", icon: Ticket, path: "/support/tickets" },
  {
    id: "ratings",
    title: "CSAT Report",
    icon: Star,
    path: "/support/ratings",
  },
  {
    id: "team-kpis",
    title: "Team KPIs",
    icon: BarChart3,
    path: "/support/kpi/team",
  },
  {
    id: "manual",
    title: "User Manual",
    icon: BookOpen,
    path: "/support/manual",
  },
];

const SUPPORT_NAV: NavItem[] = [
  {
    id: "dashboard",
    title: "Support Dashboard",
    icon: Shield,
    path: "/support",
    exact: true,
  },
  { id: "tickets", title: "Tickets", icon: Ticket, path: "/support/tickets" },
  {
    id: "ratings",
    title: "CSAT Report",
    icon: Star,
    path: "/support/ratings",
  },
  {
    id: "my-kpis",
    title: "My KPIs",
    icon: BarChart3,
    path: "/support/kpi/my",
  },
  {
    id: "manual",
    title: "User Manual",
    icon: BookOpen,
    path: "/support/manual",
  },
];

const navFor = (role: string | undefined): NavItem[] => {
  if (role === ROLES.SUPER_ADMIN) return SUPER_ADMIN_NAV;
  if (role === ROLES.SUPPORT) return SUPPORT_NAV;
  return [];
};

export function AdminSidebar() {
  const { pathname } = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { state, isMobile } = useSidebar();
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;

  const handleLogout = React.useCallback(async () => {
    try {
      queryClient.clear();
      await authClient.signOut();
      router.navigate({ to: "/" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [queryClient, router]);

  React.useEffect(() => {
    const wordmarkImage = new Image();
    wordmarkImage.src = LOGO_WORDMARK;
    const iconImage = new Image();
    iconImage.src = LOGO_ICON;
    return () => {
      wordmarkImage.src = "";
      iconImage.src = "";
    };
  }, []);

  const logoSrc = state === "collapsed" ? LOGO_ICON : LOGO_WORDMARK;

  const logoClassName = cn(
    "cursor-pointer transition-all duration-300 object-contain object-center",
    state === "collapsed" ? "h-12 w-8" : "h-auto w-[70%]"
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="mb-2 w-full overflow-hidden flex items-center justify-center">
          <Link
            to={role === ROLES.SUPER_ADMIN ? "/admin" : "/support"}
            className="cursor-pointer flex w-full h-full items-center justify-center"
          >
            <img
              src={logoSrc}
              alt="Refidly"
              className={logoClassName}
              loading="eager"
              decoding="async"
            />
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            {navFor(role).map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.path
                : pathname === item.path ||
                  pathname.startsWith(item.path + "/");

              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    asChild
                  >
                    <Link
                      to={item.path}
                      preload={
                        item.id === "my-kpis" || item.id === "team-kpis"
                          ? "intent"
                          : false
                      }
                    >
                      <Icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {/* Served by the API rather than the router, so it is a plain anchor
              instead of a nav item. Gated to super_admin and support upstream. */}
          {(role === ROLES.SUPER_ADMIN || role === ROLES.SUPPORT) && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Job Queues" asChild>
                <a href={QUEUE_BOARD_URL} target="_blank" rel="noreferrer">
                  <ListChecks className="size-4" />
                  <span>Job Queues</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user?.image ?? undefined}
                      alt={user?.name ?? undefined}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user?.name?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.name ?? "User"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email ?? undefined}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={user?.image ?? undefined}
                        alt={user?.name ?? undefined}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.name?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {user?.name ?? "User"}
                      </span>
                      <span className="truncate text-xs">
                        {user?.email ?? undefined}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    router.navigate({
                      to: "/$lang/account",
                      params: { lang: "en" },
                    })
                  }
                >
                  <User />
                  Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
