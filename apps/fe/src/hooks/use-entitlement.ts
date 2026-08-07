import { queryClient } from "@/lib/query-client";
import {
  entitlementHasFeature,
  resolveEntitlement,
  type PlanFeature,
  type SubscriptionLike,
} from "@dashboard/shared";

// _team.tsx seeds the subscription before any child mounts, so this reads the
// cache during render rather than holding a second copy in state.
export const useEntitlement = (organizationId: string) => {
  const subscription = queryClient.getQueryData<SubscriptionLike>([
    "subscription",
    organizationId,
  ]);

  // Resolved, not looked up by name, so a negotiated contract reads its own
  // entitlements here exactly as the API guard does.
  const entitlement = resolveEntitlement(subscription ?? null);

  return {
    plan: subscription?.plan ?? null,
    label: entitlement.label,
    seats: entitlement.seats,
    isCustom: entitlement.isCustom,
    has: (feature: PlanFeature) => entitlementHasFeature(entitlement, feature),
  };
};
