import { ActivityLogPage } from "@/components/AdminDashboard/ActivityLogPage/ActivityLogPage";
import { AdminRouteError } from "@/components/AdminDashboard/AdminRouteError";
import { AdminRoutePending } from "@/components/AdminDashboard/AdminRoutePending";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/activity-log")({
  component: ActivityLogPage,
  errorComponent: AdminRouteError,
  pendingComponent: AdminRoutePending,
});
