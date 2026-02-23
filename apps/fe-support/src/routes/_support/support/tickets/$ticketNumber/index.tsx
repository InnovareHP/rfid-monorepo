import { SupportDashboardTicketDetail } from "@/components/AdminDashboard/SupportAdminPage/SupportDashboardTicketDetail";
import { IsSupportOrAdmin } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_support/support/tickets/$ticketNumber/"
)({
  component: RouteComponent,
  beforeLoad: IsSupportOrAdmin,
});

function RouteComponent() {
  const { ticketNumber } = Route.useParams();
  return <SupportDashboardTicketDetail ticketId={ticketNumber} />;
}
