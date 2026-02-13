import { RequestsPage } from "@/components/RequestsPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/request")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RequestsPage />;
}
