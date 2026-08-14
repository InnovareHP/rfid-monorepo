import { AdminRouteError } from "@/components/AdminDashboard/AdminRouteError";
import { AdminRoutePending } from "@/components/AdminDashboard/AdminRoutePending";
import { UserManagementPage } from "@/components/AdminDashboard/UserManagementPage/UserManagementPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/users/")({
  component: UserManagementPage,
  errorComponent: AdminRouteError,
  pendingComponent: AdminRoutePending,
});
