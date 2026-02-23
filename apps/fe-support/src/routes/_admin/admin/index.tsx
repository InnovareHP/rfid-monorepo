import { createFileRoute } from "@tanstack/react-router";
import { AdminStatsDashboard } from "../../../components/AdminDashboard/StatsPage/AdminStatsDashboard";

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminStatsDashboard,
});
