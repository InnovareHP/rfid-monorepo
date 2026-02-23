import { UserManagementPage } from "@/components/AdminDashboard/UserManagementPage/UserManagementPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/users/")({
  component: UserManagementPage,
});
