import OnboardingPage from "@/components/onboarding/onboarding";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { Session, User } from "better-auth";

export const Route = createFileRoute("/onboarding")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    const user = context.context.user as unknown as User & {
      user_is_onboarded: boolean;
    };

    const session = context.context.session as unknown as Session & {
      activeOrganizationId: string;
    };

    if (!user) {
      throw redirect({ to: "/login" });
    }

    if (user?.user_is_onboarded || session?.activeOrganizationId) {
      throw redirect({ to: `/${session?.activeOrganizationId}` as any });
    }
  },
});

function RouteComponent() {
  return <OnboardingPage />;
}
