import { SupportDashboardTickets } from "@/components/AdminDashboard/SupportDashboardTickets";
import { IsSupport } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_support/support/tickets/")({
  component: RouteComponent,
  beforeLoad: IsSupport,
});

function RouteComponent() {
  return <SupportDashboardTickets />;
}
