// routes/_team/$team/route.tsx

import { SubscriptionBanner } from "@/components/billing/subscription-banner";
import { WriteAccessProvider } from "@/components/write-gate";
import { NotificationBell } from "@/components/notification/notification-bell";
import { AppSidebar } from "@/components/side-bar/app-sidebar";
import { PrimarySidebar } from "@/components/side-bar/primary-sidebar";
import { SidebarSkeleton } from "@/components/side-bar/sidebar-skeleton";
import { DynamicBreadcrumb } from "@/components/ui/bread-crumbs";
import { useBoardSync } from "@/hooks/use-board-sync";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { accessForStatus, type SubscriptionAccess } from "@dashboard/shared";
import type { SessionMember, Subscription } from "@dashboard/shared";
import { Separator } from "@dashboard/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@dashboard/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { Session, User } from "better-auth";
import type { Member, Organization } from "better-auth/plugins/organization";

export const Route = createFileRoute("/_team")({
  beforeLoad: async (context) => {
    const params = context.params as { team: string };
    const { user, session, member, subscription } = context.context as {
      user: User | null;
      session: (Session & { activeOrganizationId: string }) | null;
      member: SessionMember | null;
      subscription: Subscription | null;
    };

    if (!user || !session?.activeOrganizationId) {
      throw redirect({ to: "/login" });
    }

    if (params.team !== session.activeOrganizationId) {
      throw redirect({ to: `/${session.activeOrganizationId}` as any });
    }

    // Locked is an organization that never finished checkout, so there is
    // nothing behind this layout to show it. read_only still renders: the API
    // guard refuses the writes and the banner says why. Billing sits outside
    // this layout, so the redirect cannot loop.
    const access = accessForStatus(subscription?.status);
    if (access === "locked") {
      throw redirect({ to: "/billing" });
    }

    // Consumers read these with getQueryData during render, so seed the cache before any mount.
    const memberData = queryClient.setQueryData(
      ["member-data", session.activeOrganizationId],
      member ? { ...member, memberRole: member.role } : null
    ) as (Member & { memberRole: string }) | null;

    queryClient.setQueryData(
      ["subscription", session.activeOrganizationId],
      subscription
    );

    return {
      user,
      session,
      member,
      memberData,
      subscription,
      access,
      activeOrganizationId: session.activeOrganizationId,
    };
  },

  component: TeamLayout,
});

function TeamLayout() {
  const { user, activeOrganizationId, memberData, access } =
    Route.useRouteContext() as {
      user: User;
      activeOrganizationId: string;
      memberData: (Member & { memberRole: string }) | null;
      access: SubscriptionAccess;
    };

  useBoardSync();
  useIdleLogout();

  const {
    data: organizations,
    isLoading: orgLoading,
    error: orgError,
  } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await authClient.organization.list();
      if (error || !data) throw new Error("Failed to load organizations");
      return data as unknown as Organization[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60,
  });

  // Only the sidebars need the org list; page content renders without it.
  const sidebarsReady = Boolean(
    !orgLoading && !orgError && organizations && memberData
  );

  return (
    <SidebarProvider className="h-full">
      {sidebarsReady ? (
        <>
          <PrimarySidebar activeOrganizationId={activeOrganizationId} />
          <AppSidebar
            activeOrganizationId={activeOrganizationId}
            memberData={memberData as Member & { memberRole: string }}
            organizations={organizations as unknown as Organization[]}
            user={user}
          />
        </>
      ) : (
        <SidebarSkeleton />
      )}

      <SidebarInset className="relative min-h-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />

            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />

            <DynamicBreadcrumb />
          </div>

          <div className="ml-auto flex items-center px-4">
            <NotificationBell />
          </div>
        </header>

        <SubscriptionBanner organizationId={activeOrganizationId} />

        <div className="flex-1 overflow-auto">
          <WriteAccessProvider canWrite={access === "full"}>
            <Outlet />
          </WriteAccessProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
