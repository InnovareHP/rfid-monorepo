import MarketingReportPage from "@/components/marketing-report/marketing-report-page";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/report/marketing/")({
  beforeLoad: async (context) => {
    return AuthorizedRoute(context, { report: ["read"] });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingReportPage />;
}
