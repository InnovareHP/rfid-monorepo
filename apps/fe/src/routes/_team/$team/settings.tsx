import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/settings")({
  // The layout has no index of its own, so /settings rendered an empty page.
  // Booking is the only child no role or plan gate can refuse.
  beforeLoad: ({ params, location }) => {
    if (location.pathname.replace(/\/$/, "").endsWith("/settings")) {
      throw redirect({ to: `/${params.team}/settings/booking` as any });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
