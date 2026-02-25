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
  Building2,
  ChevronsUpDown,
  ClipboardList,
  LogOut,
  Shield,
  Star,
  Ticket,
  User,
  Users,
} from "lucide-react";
import * as React from "react";

const LOGO_RFID = "/images/rfid.png";
const LOGO_TARSIER = "/images/tarsier.png";

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
    const rfidImage = new Image();
    rfidImage.src = LOGO_RFID;
    const tarsierImage = new Image();
    tarsierImage.src = LOGO_TARSIER;
    return () => {
      rfidImage.src = "";
      tarsierImage.src = "";
    };
  }, []);

  const logoSrc = state === "collapsed" ? LOGO_TARSIER : LOGO_RFID;

  const logoClassName = cn(
    "cursor-pointer transition-all duration-300 object-contain object-center",
    state === "collapsed" ? "h-12 w-8" : "h-auto w-[70%]"
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="mb-2 w-full overflow-hidden flex items-center justify-center">
          <Link
            to="/support"
            className="cursor-pointer flex w-full h-full items-center justify-center"
          >
            <img
              src={logoSrc}
              alt="Admin Dashboard"
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
            {(() => {
              // Role-based navigation:
              // - SUPER_ADMIN: only Admin Dashboard (/admin)
              // - SUPPORT: support dashboard + tickets + portal
              // - others: no items for now
              const items =
                role === ROLES.SUPER_ADMIN
                  ? [
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
                      {
                        id: "tickets",
                        title: "Tickets",
                        icon: Ticket,
                        path: "/support/tickets",
                      },
                    ]
                  : role === ROLES.SUPPORT
                    ? [
                        {
                          id: "dashboard",
                          title: "Support Dashboard",
                          icon: Shield,
                          path: "/support",
                        },
                        {
                          id: "tickets",
                          title: "Tickets",
                          icon: Ticket,
                          path: "/support/tickets",
                        },
                        {
                          id: "ratings",
                          title: "CSAT Report",
                          icon: Star,
                          path: "/support/ratings",
                        },
                      ]
                    : [];

              return items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === "/support"
                    ? pathname === "/support"
                    : item.path === "/admin"
                      ? pathname === "/admin" || pathname.startsWith("/admin/")
                      : pathname === item.path ||
                        pathname.startsWith(item.path + "/");

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      asChild
                    >
                      <Link to={item.path} preload={false}>
                        <Icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              });
            })()}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
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
