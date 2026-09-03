import { PlanChip } from "@/components/billing/plan-chip";
import { NavMain } from "@/components/side-bar/nav-main";
import { NavUser } from "@/components/side-bar/nav-user";
import { TeamSwitcher } from "@/components/side-bar/team-switcher";
import { useNavItems } from "@/hooks/use-nav-items";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@dashboard/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import { type User as BetterAuthUser } from "better-auth";
import type { Member, Organization } from "better-auth/plugins/organization";
import * as React from "react";

const BRAND_WORDMARK =
  "/branding/Wordmark/Refidly%20%5BWordmark%5D%20-%20Colored%20-%20Copy.png";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeOrganizationId: string;
  memberData: Member;
  organizations: Organization[];
  user: BetterAuthUser;
};
export function AppSidebar({
  activeOrganizationId,
  memberData,
  organizations,
  user,
  ...props
}: AppSidebarProps) {
  const navMain = useNavItems(activeOrganizationId, memberData);

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="md:left-16 top-(--banner-height,0px) h-[calc(100dvh-var(--banner-height,0px))] transition-[top,height,left] duration-150 ease-[cubic-bezier(0.2,0,0,1)]"
    >
      <SidebarHeader>
        <div className="mb-2 w-full overflow-hidden group-data-[collapsible=icon]:hidden">
          <Link
            to="/$team"
            params={{ team: activeOrganizationId }}
            preload={false}
            className="flex h-full w-full items-center justify-start"
          >
            <img
              src={BRAND_WORDMARK}
              alt="Refidly"
              className="h-auto w-[70%] max-w-full cursor-pointer object-contain object-left"
              loading="eager"
              decoding="async"
            />
          </Link>
        </div>

        <TeamSwitcher
          activeOrganizationId={activeOrganizationId}
          organizations={organizations}
        />
        {/* {open && <AddRow isReferral={false} onAdd={handleAddNewLead} />} */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <PlanChip organizationId={activeOrganizationId} />

        <NavUser user={user} activeOrganizationId={activeOrganizationId} />
      </SidebarFooter>
    </Sidebar>
  );
}
