import { ManageBookingPage } from "@/components/booking/manage-booking-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/booking/$bookingId")({
  component: RouteComponent,
  errorComponent: RouteErrorComponent,
});

function RouteComponent() {
  const { bookingId } = Route.useParams();
  return <ManageBookingPage bookingId={bookingId} />;
}

function RouteErrorComponent() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">This link did not work</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Check the most recent confirmation email you received, or contact the
        person who invited you.
      </p>
    </div>
  );
}
