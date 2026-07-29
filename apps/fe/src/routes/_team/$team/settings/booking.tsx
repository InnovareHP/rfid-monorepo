import { BookingSettingsPage } from "@/components/booking/booking-settings-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/settings/booking")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BookingSettingsPage />;
}
