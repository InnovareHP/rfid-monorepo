import ExpenseLogPage from "@/components/expense-log/expense-log";
import { ROLES } from "@/lib/constant";
import { AuthorizedRole } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/log/expense/")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    return AuthorizedRole(context, [ROLES.LIASON, ROLES.ADMISSION_MANAGER]);
  },
});

function RouteComponent() {
  return <ExpenseLogPage />;
}
