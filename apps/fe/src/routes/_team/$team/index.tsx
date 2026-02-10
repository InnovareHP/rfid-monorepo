import MarketingListPage from "@/components/analytics/marketing-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingListPage />;
}
