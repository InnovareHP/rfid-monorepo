import { can } from "@/lib/permissions";
import type { DomainPermission } from "@dashboard/shared";
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
