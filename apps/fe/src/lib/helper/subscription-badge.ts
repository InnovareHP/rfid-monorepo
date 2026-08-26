// Stripe's own status, toned by what it means for the organization: past_due is
// a retry in progress, not a closed account, and must not read like one.
const STATUS_VARIANT: Record<
  string,
  "success" | "info" | "warning" | "destructive"
> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  unpaid: "destructive",
  canceled: "destructive",
  paused: "destructive",
};

export const subscriptionBadgeVariant = (status: string | null | undefined) =>
  STATUS_VARIANT[status ?? ""] ?? "secondary";
