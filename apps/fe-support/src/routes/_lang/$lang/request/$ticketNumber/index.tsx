import { TicketDetailPage } from "@/components/TicketDetailPage/TicketDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/request/$ticketNumber/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { ticketNumber } = Route.useParams();
  return <TicketDetailPage ticketId={ticketNumber} />;
}
