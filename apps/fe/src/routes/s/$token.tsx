import { PublicSubscribePage } from "@/components/marketing/subscribers/public-subscribe-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/s/$token")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PublicSubscribePage />;
}
