import ReferralAnalyticsDashboard from "@/components/analytics/analytics-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/referral-analytics")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ReferralAnalyticsDashboard />;
}
