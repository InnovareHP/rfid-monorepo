import { AdminDashboardPage } from "@/components/AdminDashboard/AdminDashboardPage";
import { IsSupportOrAdmin } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_support/support/")({
  component: AdminDashboardPage,
  beforeLoad: IsSupportOrAdmin,
});
