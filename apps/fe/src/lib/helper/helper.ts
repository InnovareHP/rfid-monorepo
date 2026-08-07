import { can } from "@/lib/permissions";
import {
  entitlementHasFeature,
  resolveEntitlement,
  type DomainPermission,
  type PlanFeature,
  type SubscriptionLike,
} from "@dashboard/shared";
import { redirect } from "@tanstack/react-router";

// Route guards check the same grant table the API enforces, so a route that
// renders is a route whose endpoints will answer.
export const AuthorizedRoute = (context: any, permission: DomainPermission) => {
  const session = context.context.session as unknown as Session & {
    memberRole: string;
    activeOrganizationId: string;
  };

  if (!can(session?.memberRole, permission)) {
    throw redirect({ to: `/${session.activeOrganizationId}` as any });
  }

  return true;
};

// A role denial sends the user home; a plan denial sends them where they can fix
// it, since billing is the upgrade path rather than a dead end.
export const EntitledRoute = (context: any, feature: PlanFeature) => {
  const { subscription } = context.context as {
    subscription: SubscriptionLike | null;
  };

  if (!entitlementHasFeature(resolveEntitlement(subscription), feature)) {
    throw redirect({ to: "/billing" as any });
  }

  return true;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatCurrency = (amount: number) => usdFormatter.format(amount);

export const formatMinutes = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
};
