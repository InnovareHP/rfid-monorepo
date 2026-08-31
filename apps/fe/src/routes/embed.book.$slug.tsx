import { PublicBookingPage } from "@/components/booking/public-booking-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/embed/book/$slug")({
  component: RouteComponent,
  errorComponent: () => (
    <p className="p-4 text-sm text-muted-foreground">
      This booking page is not available.
    </p>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    boardId: (search.boardId as string) || undefined,
  }),
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { boardId } = Route.useSearch();
  return <PublicBookingPage slug={slug} boardId={boardId} embed />;
}
