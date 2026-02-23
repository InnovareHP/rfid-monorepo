import { UserDetailPage } from "@/components/AdminDashboard/UserManagementPage/UserDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/users/$userId/")({
  component: UserDetailRoute,
});

function UserDetailRoute() {
  const { userId } = Route.useParams();
  return <UserDetailPage userId={userId} />;
}
