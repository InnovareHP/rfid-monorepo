import { RequestsPage } from "@/components/RequestsPage/RequestsPage";
import { IsAuthenticated } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/request/")({
  component: RouteComponent,
  beforeLoad: IsAuthenticated,
});

function RouteComponent() {
  return <RequestsPage />;
}
