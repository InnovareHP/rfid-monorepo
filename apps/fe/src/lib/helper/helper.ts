import { can } from "@/lib/permissions";
import {
  hasFeature,
  type DomainPermission,
  type PlanFeature,
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
    subscription: { plan: string | null } | null;
  };

  if (!hasFeature(subscription?.plan, feature)) {
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

export const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const seen = new Set<unknown>();

  const unwrap = (value: unknown): string | null => {
    if (typeof value === "string") return value.trim() || null;
    if (Array.isArray(value)) return unwrap(value.filter(Boolean)[0]);
    if (!value || typeof value !== "object" || seen.has(value)) return null;

    seen.add(value);
    const record = value as Record<string, unknown>;
    return unwrap(record.message ?? record.error ?? record.data ?? null);
  };

  const response = (error as { response?: { data?: unknown } })?.response;
  return unwrap(response?.data) ?? unwrap(error) ?? fallback;
};
