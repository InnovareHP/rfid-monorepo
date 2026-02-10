import MarketingReportPage from "@/components/marketing-report/marketing-report-page";
import { ROLES } from "@/lib/constant";
import { AuthorizedRole } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/report/marketing/")({
  beforeLoad: async (context) => {
    return AuthorizedRole(context, [ROLES.OWNER, ROLES.ADMISSION_MANAGER]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingReportPage />;
}
