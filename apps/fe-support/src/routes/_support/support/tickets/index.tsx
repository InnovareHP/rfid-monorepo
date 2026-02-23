import { SupportDashboardTickets } from "@/components/AdminDashboard/SupportAdminPage/SupportDashboardTickets";
import { IsSupportOrAdmin } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_support/support/tickets/")({
  component: RouteComponent,
  beforeLoad: IsSupportOrAdmin,
});

function RouteComponent() {
  return <SupportDashboardTickets />;
}
