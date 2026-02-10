import MasterListImportPage from "@/components/import/master-list-import-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/import/master-list/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MasterListImportPage />;
}
