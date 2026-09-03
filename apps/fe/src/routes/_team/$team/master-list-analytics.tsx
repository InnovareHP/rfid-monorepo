import MasterListAnalyticsPage from "@/components/analytics/master-list-analytics-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/master-list-analytics")({
  component: RouteComponent,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Analytics could not be loaded.</p>
    </div>
  ),
});

function RouteComponent() {
  return <MasterListAnalyticsPage />;
}
