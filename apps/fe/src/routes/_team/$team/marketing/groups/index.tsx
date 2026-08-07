import { MarketingGroupsListPage } from "@/components/marketing/groups/marketing-groups-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/groups/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingGroupsListPage />;
}
