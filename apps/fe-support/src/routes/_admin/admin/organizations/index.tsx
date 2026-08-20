import { AdminRouteError } from "@/components/AdminDashboard/AdminRouteError";
import { AdminRoutePending } from "@/components/AdminDashboard/AdminRoutePending";
import { OrganizationListPage } from "@/components/AdminDashboard/OrganizationPage/OrganizationListPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/organizations/")({
  component: OrganizationListPage,
  errorComponent: AdminRouteError,
  pendingComponent: AdminRoutePending,
});
