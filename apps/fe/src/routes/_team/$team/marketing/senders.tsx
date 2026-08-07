import { MarketingSendersPage } from "@/components/marketing/senders/marketing-senders-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/senders")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingSendersPage />;
}
