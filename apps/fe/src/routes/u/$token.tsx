import { PublicUnsubscribePage } from "@/components/marketing/subscribers/public-unsubscribe-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/u/$token")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PublicUnsubscribePage />;
}
