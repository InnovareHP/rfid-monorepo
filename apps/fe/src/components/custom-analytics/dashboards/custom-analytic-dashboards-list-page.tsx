import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/permissions";
import {
  deleteDashboard,
  getDashboards,
  type CustomAnalyticDashboard,
} from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomAnalyticDashboardCard } from "./custom-analytic-dashboard-card";
import { CustomAnalyticDashboardCardSkeleton } from "./custom-analytic-dashboard-card-skeleton";
import { CustomAnalyticDashboardFormDialog } from "./custom-analytic-dashboard-form-dialog";

const DASHBOARDS_KEY = ["custom-analytic-dashboards"];

export default function CustomAnalyticDashboardsListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { team } = useParams({ strict: false }) as { team: string };
  const [formOpen, setFormOpen] = useState(false);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Analytics Dashboards"
          description="Group saved charts into one page to view together."
        />

        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New Dashboard
          </Button>
        )}
      </div>

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
            No dashboards yet. Group a few charts to get started.
          </p>
        )}
      </div>

      <CustomAnalyticDashboardFormDialog
        open={formOpen}
        dashboard={null}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
