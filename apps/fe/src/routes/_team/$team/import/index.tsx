import MasterListImportPage from "@/components/import/master-list-import-page";
import { EntitledRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/import/")({
  beforeLoad: async (context) => {
    return EntitledRoute(context, "export");
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <MasterListImportPage />;
}
