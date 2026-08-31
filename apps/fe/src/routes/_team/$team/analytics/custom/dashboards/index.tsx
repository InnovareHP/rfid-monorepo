import CustomAnalyticDashboardsListPage from "@/components/custom-analytics/dashboards/custom-analytic-dashboards-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/analytics/custom/dashboards/"
)({
  // The sidebar's New Dashboard row lands here with the form already open.
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === true || search.new === "true" ? true : undefined,
  }),
  component: CustomAnalyticDashboardsListPage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Dashboards could not be loaded.</p>
    </div>
  ),
});
