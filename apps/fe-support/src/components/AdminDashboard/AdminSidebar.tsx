import { Avatar, AvatarFallback, AvatarImage } from "@dashboard/ui/components/avatar";
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
import { authClient, useSession } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { ChevronsUpDown, HelpCircle, LogOut, Shield } from "lucide-react";
import * as React from "react";
import {
  type AdminNavId,
  ADMIN_NAV_ITEMS,
  LOGO_ALT,
  LOGO_RFID_PATH,
  LOGO_TARSIER_PATH,
  LOG_OUT_LABEL,
  SIDEBAR_GROUP_LABEL,
  USER_FALLBACK_INITIAL,
  USER_FALLBACK_NAME,
} from "./constants";

const ADMIN_NAV_ICONS: Record<AdminNavId, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  support: HelpCircle,
};

export function AdminSidebar() {
  const { pathname } = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { state, isMobile } = useSidebar();
  const user = session?.user;

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
    rfidImage.src = LOGO_RFID_PATH;
    const tarsierImage = new Image();
    tarsierImage.src = LOGO_TARSIER_PATH;
    return () => {
      rfidImage.src = "";
      tarsierImage.src = "";
    };
  }, []);

  const logoSrc = React.useMemo(
    () => (state === "collapsed" ? LOGO_TARSIER_PATH : LOGO_RFID_PATH),
    [state]
  );

  const navItems = React.useMemo(
    () =>
      ADMIN_NAV_ITEMS.map((item) => ({
        ...item,
        icon: ADMIN_NAV_ICONS[item.id],
      })),
    []
  );

  const logoClassName = cn(
    "cursor-pointer transition-all duration-300 object-contain object-center",
    state === "collapsed" ? "h-12 w-8" : "h-auto w-[70%]"
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="mb-2 w-full overflow-hidden flex items-center justify-center">
          <Link
            to="/admin"
            className="cursor-pointer flex w-full h-full items-center justify-center"
          >
            <img
              src={logoSrc}
              alt={LOGO_ALT}
              className={logoClassName}
              loading="eager"
              decoding="async"
            />
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{SIDEBAR_GROUP_LABEL}</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isAdminRoute = item.path === "/admin";
              const isActive = isAdminRoute
                ? pathname === "/admin" || pathname.startsWith("/admin/")
                : pathname === "/en" || pathname.startsWith("/en/");
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
                    <Link
                      to={item.path}
                      params={item.params ?? undefined}
                      preload={false}
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
                      {user?.name?.charAt(0) ?? USER_FALLBACK_INITIAL}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.name ?? USER_FALLBACK_NAME}
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
{user?.name?.charAt(0) ?? USER_FALLBACK_INITIAL}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.name ?? USER_FALLBACK_NAME}
                    </span>
                      <span className="truncate text-xs">
                        {user?.email ?? undefined}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  {LOG_OUT_LABEL}
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
