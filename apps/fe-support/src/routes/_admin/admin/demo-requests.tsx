import { AdminRouteError } from "@/components/AdminDashboard/AdminRouteError";
import { AdminRoutePending } from "@/components/AdminDashboard/AdminRoutePending";
import { DemoRequestsPage } from "@/components/AdminDashboard/DemoPage/DemoRequestsPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/demo-requests")({
  component: DemoRequestsPage,
  errorComponent: AdminRouteError,
  pendingComponent: AdminRoutePending,
});
