import { SupportDashboardTicketDetail } from "@/components/AdminDashboard/SupportDashboardTicketDetail";
import { IsSupport } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_support/support/tickets/$ticketNumber/"
)({
  component: RouteComponent,
  beforeLoad: IsSupport,
});

function RouteComponent() {
  const { ticketNumber } = Route.useParams();
  return <SupportDashboardTicketDetail ticketId={ticketNumber} />;
}
