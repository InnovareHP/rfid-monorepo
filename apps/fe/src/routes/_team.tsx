// routes/_team/$team/route.tsx

import { useEffect, useMemo } from "react";

import Loader from "@/components/loader";
import { AppSidebar } from "@/components/side-bar/app-sidebar";
import { PrimarySidebar } from "@/components/side-bar/primary-sidebar";
import { DynamicBreadcrumb } from "@/components/ui/bread-crumbs";
import { useBoardSync } from "@/hooks/use-board-sync";
import { authClient } from "@/lib/auth-client";
import { applyBrandColor, removeBrandColor } from "@/lib/color-utils";
import type { SessionMember, Subscription } from "@dashboard/shared";
import { Separator } from "@dashboard/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@dashboard/ui/components/sidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { Session, User } from "better-auth";
import type { Member, Organization } from "better-auth/plugins/organization";

export const Route = createFileRoute("/_team")({
  beforeLoad: async (context) => {
    const params = context.params as { team: string };
    const { user, session, member, subscription } = context.context as {
      user: User;
      session: Session & { activeOrganizationId: string };
      member: SessionMember | null;
      subscription: Subscription | null;
    };

    if (!user || !session?.activeOrganizationId) {
      throw redirect({ to: "/login" });
    }

    if (params.team !== session.activeOrganizationId) {
      throw redirect({ to: `/${session.activeOrganizationId}` as any });
    }

    return {
      user,
      session,
      member,
      subscription,
      activeOrganizationId: session.activeOrganizationId,
    };
  },

  component: TeamLayout,
});

function TeamLayout() {
  const { user, activeOrganizationId, member, subscription } =
    Route.useRouteContext() as {
      user: User;
      activeOrganizationId: string;
      member: SessionMember | null;
      subscription: Subscription | null;
    };

  useBoardSync();

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

  const queryClient = useQueryClient();

  const memberData = member
    ? ({ ...member, memberRole: member.role } as unknown as Member & {
        memberRole: string;
      })
    : undefined;
  const activeSubscription = subscription;

  useEffect(() => {
    queryClient.setQueryData(["member-data", activeOrganizationId], memberData);
    queryClient.setQueryData(
      ["subscription", activeOrganizationId],
      activeSubscription
    );
  }, [queryClient, activeOrganizationId, memberData, activeSubscription]);

  // useEffect(() => {
  //   if (subscriptionLoading) return;
  //   if (
  //     activeSubscription &&
  //     activeSubscription.status !== "active" &&
  //     activeSubscription.status !== "trialing"
  //   ) {
  //     window.location.href = "/billing";
  //   } else if (!activeSubscription) {
  //     window.location.href = "/billing";
  //   }
  // }, [subscriptionLoading, activeSubscription]);

  const isLoading = orgLoading;
  const hasError = orgError;
  const isReady = !isLoading && !hasError && organizations && memberData;

  const ctxValue = useMemo(() => {
    if (!isReady) return null;
    return {
      user,
      activeOrganizationId,
      organizations: organizations as unknown as Organization[],
      memberData: memberData as Member,
      activeSubscription: activeSubscription as Subscription | null,
    };
  }, [
    isReady,
    user,
    activeOrganizationId,
    organizations,
    memberData,
    activeSubscription,
  ]);

  const brandColor = useMemo(() => {
    if (!organizations) return null;
    const activeOrg = (organizations as any[]).find(
      (o) => o.id === activeOrganizationId
    );
    try {
      const metadata = activeOrg?.metadata
        ? JSON.parse(activeOrg.metadata)
        : null;
      return metadata?.brandColor || null;
    } catch {
      return null;
    }
  }, [organizations, activeOrganizationId]);

  useEffect(() => {
    if (brandColor) {
      applyBrandColor(brandColor);
    } else {
      removeBrandColor();
    }
    return () => {
      removeBrandColor();
    };
  }, [brandColor]);

  return (
    <SidebarProvider className="h-full">
      <Loader isLoading={!isReady} />

      {isReady && ctxValue && (
        <>
          <PrimarySidebar activeOrganizationId={activeOrganizationId} />
          <AppSidebar
            activeOrganizationId={activeOrganizationId}
            memberData={memberData as Member & { memberRole: string }}
            organizations={organizations as unknown as Organization[]}
            user={user}
          />

          <SidebarInset className="min-h-0 overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />

                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />

                <DynamicBreadcrumb />
              </div>
            </header>

            <div className="flex-1 overflow-auto">
              <Outlet />
            </div>
          </SidebarInset>
        </>
      )}
    </SidebarProvider>
  );
}
