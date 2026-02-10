import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}

