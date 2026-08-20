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

// Scopes an export to a date range on the record's own created date. The report
// endpoints filter server side; the CRM list exports rows already in hand, so it
// narrows them here. An inclusive "to" needs the whole day, hence the < next day.
export const filterByCreatedAt = <T extends { createdAt?: string | Date }>(
  rows: T[],
  range: { from?: string; to?: string }
): T[] => {
  if (!range.from && !range.to) return rows;

  const from = range.from ? new Date(range.from).getTime() : null;
  const to = range.to ? new Date(range.to).getTime() + 86_400_000 : null;

  return rows.filter((row) => {
    if (!row.createdAt) return false;
    const created = new Date(row.createdAt).getTime();
    if (from !== null && created < from) return false;
    if (to !== null && created >= to) return false;
    return true;
  });
};
