import ExpenseLogPage from "@/components/expense-log/expense-log";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/log/expense/")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    return AuthorizedRoute(context, { log: ["create"] });
  },
});

function RouteComponent() {
  return <ExpenseLogPage />;
}
