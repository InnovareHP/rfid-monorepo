import { AdminDashboardPage } from "@/components/AdminDashboard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin")({
  component: AdminDashboardPage,
});
