import MarketingListPage from "@/components/analytics/marketing-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/master-list-analytics")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingListPage />;
}
