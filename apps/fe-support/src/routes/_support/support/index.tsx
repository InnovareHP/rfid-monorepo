import { AdminDashboardPage } from "@/components/AdminDashboard/AdminDashboardPage";
import { IsSupport } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_support/support/")({
  component: AdminDashboardPage,
  beforeLoad: IsSupport,
});
