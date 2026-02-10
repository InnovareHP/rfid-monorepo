import Timeline from "@/components/timeline/timeline";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/master-list/leads/$lead/timeline"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <Timeline  />;
}
