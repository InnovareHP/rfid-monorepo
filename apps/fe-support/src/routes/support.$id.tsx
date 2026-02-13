import { TicketDetailPage } from "@/components/TicketDetailPage/TicketDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/support/$id")({
  component: SupportPage,
});

function SupportPage() {
  const { id } = Route.useParams();
  return <TicketDetailPage ticketId={id} />;
}
