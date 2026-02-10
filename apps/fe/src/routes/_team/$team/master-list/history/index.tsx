import HistoryReportPage from "@/components/history-report/history-report-page";
import { ROLES } from "@/lib/constant";
import { AuthorizedRole } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/master-list/history/")({
  beforeLoad: async (context) => {
    return AuthorizedRole(context, [ROLES.OWNER, ROLES.ADMISSION_MANAGER]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <HistoryReportPage />;
}
