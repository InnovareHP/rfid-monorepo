import LeadOption from "@/components/lead-option/lead-option";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/master-list/leads/option/$option/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <LeadOption />;
}
