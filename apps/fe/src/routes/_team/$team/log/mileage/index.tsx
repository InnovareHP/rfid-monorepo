import MileageLogPage from "@/components/mileage-log/mileage-log-page";
import { ROLES } from "@/lib/constant";
import { AuthorizedRole } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/log/mileage/")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    return AuthorizedRole(context, [ROLES.LIASON, ROLES.ADMISSION_MANAGER]);
  },
});

function RouteComponent() {
  return <MileageLogPage />;
}
