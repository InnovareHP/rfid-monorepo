import MileageReportPage from "@/components/mileage-list/mileage-report-page";
import { AuthorizedRole } from "@/lib/helper/helper";
import { ROLES } from "@dashboard/shared";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/report/mileage/")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    return AuthorizedRole(context, [ROLES.OWNER, ROLES.ADMISSION_MANAGER]);
  },
});

function RouteComponent() {
  return <MileageReportPage />;
}
