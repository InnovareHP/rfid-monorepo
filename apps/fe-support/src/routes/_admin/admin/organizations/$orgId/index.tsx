import { AdminRouteError } from "@/components/AdminDashboard/AdminRouteError";
import { AdminRoutePending } from "@/components/AdminDashboard/AdminRoutePending";
import { OrganizationDetailPage } from "@/components/AdminDashboard/OrganizationPage/OrganizationDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/organizations/$orgId/")({
  component: OrganizationDetailPage,
  errorComponent: AdminRouteError,
  pendingComponent: AdminRoutePending,
});
