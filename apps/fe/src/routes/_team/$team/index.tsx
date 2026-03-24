import ReferralAnalyticsDashboard from "@/components/analytics/analytics-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ReferralAnalyticsDashboard />;
}
