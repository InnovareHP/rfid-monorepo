import TeamPage from "@/components/team-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/team")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TeamPage />;
}
