import { CustomAnalyticDashboardCardSkeleton } from "@/components/custom-analytics/dashboards/custom-analytic-dashboard-card-skeleton";
import CustomAnalyticDashboardViewPage from "@/components/custom-analytics/dashboards/custom-analytic-dashboard-view-page";
import { useModules } from "@/hooks/use-modules";
import { moduleKeyFromParam } from "@/lib/helper/module-route";
import { can } from "@/lib/permissions";
import { getDefaultDashboard } from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { Button } from "@dashboard/ui/components/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { LayoutTemplate } from "lucide-react";
import { lazy, Suspense } from "react";

// The referral and master list pages are hand-built reports - a gauge, a status
// selector, a county heat map - none of which the generic chart engine renders.
// They stay themselves rather than being approximated.
const LEGACY_PAGES: Record<string, ReturnType<typeof lazy>> = {
  REFERRAL: lazy(() => import("@/components/analytics/analytics-page")),
  LEAD: lazy(() => import("@/components/analytics/master-list-analytics-page")),
};

export default function ModuleAnalyticsPage() {
  const { team, moduleKey: moduleKeyParam } = useParams({ strict: false }) as {
    team: string;
    moduleKey: string;
  };
  const moduleKey = moduleKeyFromParam(moduleKeyParam);
  const LegacyPage = LEGACY_PAGES[moduleKey];
  const queryClient = useQueryClient();

  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canManage = can(memberData?.role, { analytics: ["manage"] });

  const { data: modules = [] } = useModules({ includeArchived: true });

  // Contacts and companies seed no dashboard by design, so the 404 is the
  // answer, not a transient failure to retry through.
  const { data: dashboard, isPending } = useQuery({
    queryKey: ["module-default-dashboard", moduleKey],
    queryFn: () => getDefaultDashboard(moduleKey),
    retry: false,
  });

  if (LegacyPage) {
    return (
      <Suspense
        fallback={
          <div className="page-style">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <CustomAnalyticDashboardCardSkeleton />
              <CustomAnalyticDashboardCardSkeleton />
            </div>
          </div>
        }
      >
        <LegacyPage />
      </Suspense>
    );
  }

  if (isPending) {
    return (
      <div className="page-style">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CustomAnalyticDashboardCardSkeleton />
          <CustomAnalyticDashboardCardSkeleton />
        </div>
      </div>
    );
  }

  const label = modules.find((module) => module.key === moduleKey)?.label;

  if (!dashboard) {
    return (
      <div className="page-style">
        <p className="py-12 text-center text-sm text-muted-foreground">
          This module has no analytics yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <CustomAnalyticDashboardViewPage
        dashboardId={dashboard.id}
        description={`How ${label ?? "this module"} is trending.`}
        insightsLabel={label ?? "this module"}
        editable={false}
      />

      {/* Layout and membership of the seeded page are edited where every other
          dashboard is; the charts themselves are edited on their own tiles. */}
      {canManage && (
        <div className="page-style pt-0">
          <Button variant="outline" asChild>
            <Link
              to="/$team/analytics/custom/dashboards/$dashboardId"
              params={{ team, dashboardId: dashboard.id }}
            >
              <LayoutTemplate className="h-4 w-4" />
              Edit dashboard
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}
