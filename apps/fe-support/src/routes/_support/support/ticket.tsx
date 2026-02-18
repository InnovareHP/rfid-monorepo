import { IsSupport } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_support/support/ticket")({
  component: RouteComponent,
  beforeLoad: IsSupport,
});

function RouteComponent() {
  return <div>Hello "/_support/ticket"!</div>;
}
