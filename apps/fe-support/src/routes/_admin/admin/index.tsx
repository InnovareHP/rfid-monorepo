import { AdminStatsDashboard } from "../../../components/AdminDashboard/AdminStatsDashboard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminStatsDashboard,
});
