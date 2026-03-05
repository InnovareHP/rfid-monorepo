import HelpPage from "@/components/help/help-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/help")({
  component: RouteComponent,
});

function RouteComponent() {
  return <HelpPage />;
}
