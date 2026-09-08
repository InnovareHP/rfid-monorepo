import MasterListPage from "@/components/master-list/master-list-page";
import { validateRecordSearch } from "@/lib/helper/record-search";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/master-list/")({
  validateSearch: validateRecordSearch,
  component: RouteComponent,
  shouldReload: false,
});

function RouteComponent() {
  return <MasterListPage />;
}
