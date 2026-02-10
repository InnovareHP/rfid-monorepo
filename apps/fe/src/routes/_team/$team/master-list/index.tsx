import MasterListPage from "@/components/master-list/master-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/master-list/")({
  component: RouteComponent,
  shouldReload: false,
});

function RouteComponent() {
  return <MasterListPage />;
}
