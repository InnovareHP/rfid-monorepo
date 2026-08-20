import { AdminRouteError } from "@/components/AdminDashboard/AdminRouteError";
import { AdminRoutePending } from "@/components/AdminDashboard/AdminRoutePending";
import { AdminStatsDashboard } from "@/components/AdminDashboard/StatsPage/AdminStatsDashboard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminStatsDashboard,
  errorComponent: AdminRouteError,
  pendingComponent: AdminRoutePending,
});
