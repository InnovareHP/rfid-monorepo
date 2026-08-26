import { useEntitlement } from "@/hooks/use-entitlement";
import { useSubscriptionState } from "@/hooks/use-subscription-state";
import { subscriptionBadgeVariant } from "@/lib/helper/subscription-badge";
import { formatCapitalize } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { useSidebar } from "@dashboard/ui/components/sidebar";
import { Link } from "@tanstack/react-router";

// The plan and its Stripe status, one click from billing. Hidden while the
// sidebar is a rail, where there is no room for either word.
export function PlanChip({ organizationId }: { organizationId: string }) {
  const { label } = useEntitlement(organizationId);
  const { status } = useSubscriptionState(organizationId);
  const { state } = useSidebar();

  if (state === "collapsed") return null;

  return (
    <Link
      to="/billing"
      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground hover:bg-sidebar-accent"
    >
      <span className="truncate font-medium">{formatCapitalize(label)}</span>

      <Badge variant={subscriptionBadgeVariant(status)}>
        {formatCapitalize(status ?? "none")}
      </Badge>
    </Link>
  );
}
