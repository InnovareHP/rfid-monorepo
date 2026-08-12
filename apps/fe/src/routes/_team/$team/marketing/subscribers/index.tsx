import { MarketingSubscribersPage } from "@/components/marketing/subscribers/marketing-subscribers-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/subscribers/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingSubscribersPage />;
}
