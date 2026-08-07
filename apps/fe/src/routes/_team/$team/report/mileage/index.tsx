import MileageReportPage from "@/components/mileage-list/mileage-report-page";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/report/mileage/")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    return AuthorizedRoute(context, { report: ["read"] });
  },
});

function RouteComponent() {
  return <MileageReportPage />;
}
