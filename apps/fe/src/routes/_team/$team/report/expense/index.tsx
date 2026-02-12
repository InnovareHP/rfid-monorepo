import ExpenseReportPage from "@/components/expense-report/expense-report";
import { AuthorizedRole } from "@/lib/helper/helper";
import { ROLES } from "@dashboard/shared";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/report/expense/")({
  beforeLoad: async (context) => {
    return AuthorizedRole(context, [ROLES.OWNER, ROLES.ADMISSION_MANAGER]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <ExpenseReportPage />;
}
