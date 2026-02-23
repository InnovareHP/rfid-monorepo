import { OrganizationDetailPage } from "@/components/AdminDashboard/OrganizationPage/OrganizationDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/organizations/$orgId/")({
  component: OrganizationDetailPage,
});
