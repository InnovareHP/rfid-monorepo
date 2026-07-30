import { AdminLayout } from "@/components/AdminDashboard/AdminLayout";
import { IsSuperAdmin } from "@/lib/authorization";
import { useIdleLogout } from "@/lib/use-idle-logout";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin")({
  // Only SUPER_ADMIN can access anything under /admin
  beforeLoad: IsSuperAdmin,
  component: AdminLayoutWrapper,
});

function AdminLayoutWrapper() {
  useIdleLogout();

  return (
    <AdminLayout breadcrumbLabel="Admin Dashboard">
      <Outlet />
    </AdminLayout>
  );
}
