import IntegrationPage from "@/components/integrations/integration-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/integrations")({
  component: RouteComponent,
});

function RouteComponent() {
  return <IntegrationPage />;
}
