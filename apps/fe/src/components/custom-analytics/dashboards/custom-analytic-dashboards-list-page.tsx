import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/permissions";
import {
  deleteDashboard,
  getDashboards,
  type CustomAnalyticDashboard,
} from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useNavigate,
  useParams,
  useRouteContext,
  useSearch,
} from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { toast } from "sonner";
import { CustomAnalyticDashboardCard } from "./custom-analytic-dashboard-card";
import { CustomAnalyticDashboardCardSkeleton } from "./custom-analytic-dashboard-card-skeleton";
import { CustomAnalyticDashboardFormDialog } from "./custom-analytic-dashboard-form-dialog";
import { UnfiledChartsSection } from "./unfiled-charts-section";

const DASHBOARDS_KEY = ["custom-analytic-dashboards"];

export default function CustomAnalyticDashboardsListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { team } = useParams({ strict: false }) as { team: string };

  // Creating lives in the sidebar, so the open state is the url, not local UI
  // state: the nav row links here with ?new=true and closing drops the param.
  const { new: creating } = useSearch({
    from: "/_team/$team/analytics/custom/dashboards/",
  });

  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canManage = can(memberData?.role, { analytics: ["manage"] });

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: DASHBOARDS_KEY,
    queryFn: getDashboards,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDashboard,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: DASHBOARDS_KEY });
      const previous =
        queryClient.getQueryData<CustomAnalyticDashboard[]>(DASHBOARDS_KEY);

      queryClient.setQueryData<CustomAnalyticDashboard[]>(
        DASHBOARDS_KEY,
        (current = []) => current.filter((dashboard) => dashboard.id !== id)
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(DASHBOARDS_KEY, context?.previous);
      toast.error("Failed to delete dashboard");
    },
    onSuccess: () => toast.success("Dashboard deleted"),
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: DASHBOARDS_KEY });
      // The dashboard is gone, so refetching its preview would 404.
      queryClient.removeQueries({
        queryKey: ["custom-analytic-dashboard-preview", id],
      });
    },
  });

  return (
    <div className="page-style">
      <PageHeader
        title="Analytics Dashboards"
        description="Group saved charts into one page to view together."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <CustomAnalyticDashboardCardSkeleton key={index} />
          ))}

        {dashboards.map((dashboard) => (
          <CustomAnalyticDashboardCard
            key={dashboard.id}
            dashboard={dashboard}
            canManage={canManage}
            onOpen={() =>
              navigate({
                to: "/$team/analytics/custom/dashboards/$dashboardId",
                params: { team, dashboardId: dashboard.id },
              })
            }
            onDelete={() => deleteMutation.mutate(dashboard.id)}
          />
        ))}

        {!isLoading && dashboards.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No dashboards yet. Use New Dashboard in the sidebar to group a few
            charts.
          </p>
        )}
      </div>

      <UnfiledChartsSection canManage={canManage} />

      <CustomAnalyticDashboardFormDialog
        open={canManage && creating === true}
        dashboard={null}
        onCreated={(dashboardId) =>
          navigate({
            to: "/$team/analytics/custom/dashboards/$dashboardId",
            params: { team, dashboardId },
          })
        }
        onOpenChange={(open) => {
          if (open) return;
          navigate({
            to: "/$team/analytics/custom/dashboards",
            params: { team },
            search: { new: undefined },
            replace: true,
          });
        }}
      />
    </div>
  );
}
