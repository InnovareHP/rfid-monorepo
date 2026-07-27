import { AdminLayout } from "@/components/AdminDashboard/AdminLayout";
import { IsSupportOrAdmin } from "@/lib/authorization";
import { useIdleLogout } from "@/lib/use-idle-logout";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_support")({
  beforeLoad: IsSupportOrAdmin,
  component: AdminLayoutWrapper,
});

function AdminLayoutWrapper() {
  useIdleLogout();

  return (
    <AdminLayout breadcrumbLabel="Admin">
      <Outlet />
    </AdminLayout>
  );
}
