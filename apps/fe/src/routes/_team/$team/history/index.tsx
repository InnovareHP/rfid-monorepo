import HistoryReportPage from "@/components/history-report/history-report-page";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/history/")({
  beforeLoad: async (context) => {
    return AuthorizedRoute(context, { report: ["read"] });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <HistoryReportPage />;
}
