import { ManualManagementPage } from "@/components/AdminDashboard/ManualPage/ManualManagementPage";
import { IsSupportOrAdmin } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_support/support/manual/")({
  component: RouteComponent,
  beforeLoad: IsSupportOrAdmin,
});

function RouteComponent() {
  return <ManualManagementPage />;
}
