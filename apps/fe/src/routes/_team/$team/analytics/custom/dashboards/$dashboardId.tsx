import CustomAnalyticDashboardViewPage from "@/components/custom-analytics/dashboards/custom-analytic-dashboard-view-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/analytics/custom/dashboards/$dashboardId"
)({
  component: CustomAnalyticDashboardViewPage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Dashboard could not be loaded.</p>
    </div>
  ),
});
