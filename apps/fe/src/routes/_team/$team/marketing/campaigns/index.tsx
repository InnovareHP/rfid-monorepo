import { MarketingCampaignsListPage } from "@/components/marketing/campaigns/marketing-campaigns-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/campaigns/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingCampaignsListPage />;
}
