import { MarketingBlastsListPage } from "@/components/marketing/blasts/marketing-blasts-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/blasts/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingBlastsListPage />;
}
