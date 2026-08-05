import { queryClient } from "@/lib/query-client";
import { hasFeature, seatCap, type PlanFeature } from "@dashboard/shared";

// _team.tsx seeds the subscription before any child mounts, so this reads the
// cache during render rather than holding a second copy in state.
export const useEntitlement = (organizationId: string) => {
  const subscription = queryClient.getQueryData<{ plan: string | null }>([
    "subscription",
    organizationId,
  ]);

  const plan = subscription?.plan ?? null;

  return {
    plan,
    seats: seatCap(plan),
    has: (feature: PlanFeature) => hasFeature(plan, feature),
  };
};
