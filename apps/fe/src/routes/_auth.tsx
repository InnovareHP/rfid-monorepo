import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { Session, User } from "better-auth";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    const user = context.user as
      | (User & { user_is_onboarded?: boolean })
      | null;
    const session = context.session as
      | (Session & { activeOrganizationId?: string })
      | null;
    const pathname = location?.pathname ?? window.location.pathname;

    if (
      user &&
      !user.user_is_onboarded &&
      pathname !== "/onboarding"
    ) {
      throw redirect({ to: "/onboarding" });
    }

    if (
      user &&
      user.user_is_onboarded &&
      session &&
      session.activeOrganizationId &&
      !pathname.includes(session.activeOrganizationId)
    ) {
      throw redirect({ to: `/${session.activeOrganizationId}` as any });
    }

    // Otherwise, continue rendering child routes
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
