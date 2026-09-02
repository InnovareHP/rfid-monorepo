import { queryClient } from "@/lib/query-client";
import { accessForStatus } from "@dashboard/shared";

// Only the fields the banner reads. The row is seeded by _team.tsx straight
// from the session, so every value here is Stripe's, not the app's.
type CachedSubscription = {
  status: string | null;
  periodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
};

export type SubscriptionNotice =
  | "read_only"
  | "past_due"
  | "canceling"
  | "trial_ending";

// A trial only earns a banner once it is close enough to matter.
const TRIAL_NOTICE_DAYS = 7;

const daysUntil = (value: string | null | undefined) => {
  if (!value) return null;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
};

// Derived during render off the cache _team.tsx seeds, the same way
// useEntitlement reads it, so nothing here holds a second copy of the status.
export const useSubscriptionState = (organizationId: string) => {
  const subscription = queryClient.getQueryData<CachedSubscription>([
    "subscription",
    organizationId,
  ]);

  const status = subscription?.status ?? null;
  const access = accessForStatus(status);
  const trialDaysLeft =
    status === "trialing" ? daysUntil(subscription?.trialEnd) : null;

  // Most urgent wins: a read-only organization does not also need a trial notice.
  const notice: SubscriptionNotice | null =
    access === "read_only"
      ? "read_only"
      : status === "past_due"
        ? "past_due"
        : subscription?.cancelAtPeriodEnd
          ? "canceling"
          : trialDaysLeft !== null && trialDaysLeft <= TRIAL_NOTICE_DAYS
            ? "trial_ending"
            : null;

  return {
    access,
    status,
    canWrite: access === "full",
    notice,
    trialDaysLeft,
    endsOn: subscription?.periodEnd ?? null,
  };
};
