import HistoryReportPage from "@/components/history-report/history-report-page";
import { AuthorizedRole } from "@/lib/helper/helper";
import { ROLES } from "@dashboard/shared";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/history/")({
  beforeLoad: async (context) => {
    return AuthorizedRole(context, [
      ROLES.OWNER,
      ROLES.ADMIN,
      ROLES.ADMISSION_MANAGER,
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <HistoryReportPage />;
}
