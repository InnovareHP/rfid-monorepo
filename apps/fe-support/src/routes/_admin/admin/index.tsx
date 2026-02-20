import { createFileRoute } from "@tanstack/react-router";
import { AdminStatsDashboard } from "../../../components/AdminDashboard/AdminStatsDashboard";

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminStatsDashboard,
});
