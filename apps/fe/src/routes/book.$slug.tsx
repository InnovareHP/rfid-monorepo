import { PublicBookingPage } from "@/components/booking/public-booking-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/book/$slug")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    boardId: (search.boardId as string) || undefined,
  }),
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { boardId } = Route.useSearch();
  return <PublicBookingPage slug={slug} boardId={boardId} />;
}
