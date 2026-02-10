import { BillingPage } from "@/components/billing-page";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { Session, User } from "better-auth";

export const Route = createFileRoute("/billing")({
  beforeLoad: async (context) => {
    const user = context.context.user as unknown as User & {
      user_is_onboarded: boolean;
    };

    if (!user) {
      throw redirect({ to: "/login" });
    }

    const session = context.context.session as unknown as Session & {
      activeOrganizationId: string;
    };

    const [subscriptions, memberData] = await Promise.all([
      authClient.subscription.list({
        query: {
          referenceId: session.activeOrganizationId,
        },
      }),
      authClient.organization.getActiveMember(),
    ]);

    const activeSubscription = subscriptions?.data?.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );

    return {
      activeOrganizationId: session.activeOrganizationId,
      activeSubscription,
      user,
      memberData: memberData.data,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <BillingPage context="/billing" />;
}
