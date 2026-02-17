import { AdminLayout } from "@/components/AdminDashboard";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin")({
  // No auth/session check for now — design-only. Add beforeLoad with getSession() + redirect when ready for backend.
  component: AdminLayoutWrapper,
});

function AdminLayoutWrapper() {
  return (
    <AdminLayout breadcrumbLabel="Admin">
      <Outlet />
    </AdminLayout>
  );
}
