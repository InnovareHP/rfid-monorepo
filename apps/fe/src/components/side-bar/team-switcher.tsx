import { authClient } from "@/lib/auth-client";
import type { Organization } from "@dashboard/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@dashboard/ui/components/sidebar";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ChevronsUpDown, User } from "lucide-react";
import { toast } from "sonner";

type TeamSwitcherProps = {
  activeOrganizationId: string;
  organizations: Organization[];
};
export function TeamSwitcher({
  activeOrganizationId,
  organizations,
}: TeamSwitcherProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const queryClient = useQueryClient();

  const activeTeam = organizations.find(
    (org) => org.id === activeOrganizationId
  );

  const HandleSelectActiveTeam = async (team: Organization) => {
    try {
      await authClient.organization.setActive({
        organizationId: team.id,
      });

      queryClient.clear();

      router.navigate({
        to: "/$team",
        params: { team: String(team.id) },
      });

      window.location.reload();
    } catch (error) {
      toast.error("Failed to switch team");
    }
  };

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:hidden">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeTeam?.name ?? "Select a team"}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>

            {organizations.map((team, index) => {
              const Logo = team.logo ?? User;

              return (
                <DropdownMenuItem
                  key={team.id ?? team.name}
                  onClick={() => HandleSelectActiveTeam(team)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="size-6 shrink-0"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Logo className="size-3.5 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span>{team.name}</span>
                  </div>

                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
