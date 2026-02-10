import CountyConfigPage from "@/components/county-config/county-config-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/county-config")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CountyConfigPage />;
}
