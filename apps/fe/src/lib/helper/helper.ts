import { redirect } from "@tanstack/react-router";

export const AuthorizedRole = (context: any, roles: string[]) => {
  const session = context.context.session as unknown as Session & {
    memberRole: string;
    activeOrganizationId: string;
  };

  if (!roles.includes(session?.memberRole)) {
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
