import { AdminRouteError } from "@/components/AdminDashboard/AdminRouteError";
import { AdminRoutePending } from "@/components/AdminDashboard/AdminRoutePending";
import { UserDetailPage } from "@/components/AdminDashboard/UserManagementPage/UserDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/users/$userId/")({
  component: UserDetailRoute,
  errorComponent: AdminRouteError,
  pendingComponent: AdminRoutePending,
});

function UserDetailRoute() {
  const { userId } = Route.useParams();
  return <UserDetailPage userId={userId} />;
}
