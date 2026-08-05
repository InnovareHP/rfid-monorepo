import ExpenseReportPage from "@/components/expense-report/expense-report";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/report/expense/")({
  beforeLoad: async (context) => {
    return AuthorizedRoute(context, { report: ["read"] });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <ExpenseReportPage />;
}
