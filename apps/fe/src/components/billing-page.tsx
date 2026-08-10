import { TransactionsCard } from "@/components/billing/transactions-card";
import { authClient } from "@/lib/auth-client";
import { can } from "@/lib/permissions";
import {
  cancelSubscription,
  getPlanCard,
  resumeSubscription,
} from "@/services/billing/billing-service";
import { formatCapitalize, ROLES, type Subscription } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { Calendar, LogOut, Users } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { PlansPage } from "./plans-page";

export function BillingPage({
  className,
  activeOrganizationId: propOrgId,
  activeSubscription: propSub,
  memberData: propMember,
  context: propContext,
  ...props
}: {
  activeOrganizationId?: string;
  activeSubscription?: Subscription;
  memberData?: Member;
  context?: "/_team" | "/billing";
} & React.ComponentProps<"div">) {
  const context = useRouteContext({ from: propContext ?? "/_team" }) as {
    activeOrganizationId: string;
    activeSubscription: Subscription;
    memberData: Member;
  };

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const subscriptions = queryClient.getQueryData<Subscription[]>([
    "subscription",
    context.activeOrganizationId,
  ]) as unknown as Subscription | null;

  const activeOrganizationId = propOrgId ?? context.activeOrganizationId;

  const memberData = queryClient.getQueryData([
    "member-data",
    activeOrganizationId,
  ]);

  // The portal button reached every role while every billing endpoint behind it
  // requires manage_billing.
  const canManageBilling = can((memberData as Member)?.role, {
    billing: ["manage_billing"],
  });

  const billingInfo = subscriptions && {
    currentPlan: subscriptions?.plan,
    billingCycle: "monthly",
    nextBillingDate: subscriptions?.periodEnd,
    status: subscriptions?.status,
  };

  const { data: planCard } = useQuery({
    queryKey: ["billing-plan", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: getPlanCard,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async () => {
      toast.success("Subscription will cancel at the end of the period");
      await queryClient.invalidateQueries({ queryKey: ["billing-plan"] });
    },
    onError: () => toast.error("Could not cancel the subscription"),
  });

  const resumeMutation = useMutation({
    mutationFn: resumeSubscription,
    onSuccess: async () => {
      toast.success("Subscription resumed");
      await queryClient.invalidateQueries({ queryKey: ["billing-plan"] });
    },
    onError: () => toast.error("Could not resume the subscription"),
  });

  const openBillingPortal = useCallback(async () => {
    if (!activeOrganizationId) return;

    const { data, error } = await authClient.subscription.billingPortal({
      referenceId: activeOrganizationId,
      returnUrl: `${window.location.href}`,
    });

    if (error) toast.error(error.message);
    if (data?.url) window.location.href = data.url;
  }, [activeOrganizationId]);

  const handleLogout = useCallback(async () => {
    try {
      await authClient.signOut();

      queryClient.clear();
      navigate({ to: "/login" });
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  }, [navigate]);

  if (!billingInfo) {
    return <PlansPage context={propContext} handleLogout={handleLogout} />;
  }

  return (
    <div
      className={cn("w-full p-6 space-y-8", className)}
      {...props}
    >
      <PageHeader
        title="Billing & Subscription"
        description="Manage your subscription, payment methods, and view billing history"
      />

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">
                {formatCapitalize(billingInfo.currentPlan)}
              </span>

              <Badge
                variant={
                  billingInfo.status === "active" ||
                  billingInfo.status === "trialing"
                    ? "default"
                    : "secondary"
                }
              >
                {formatCapitalize(billingInfo.status)}
              </Badge>
            </div>

            {billingInfo.nextBillingDate &&
            (memberData as Member)?.role === ROLES.OWNER ? (
              <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Next billing:{" "}
                  {new Date(billingInfo.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground">
                <span>Contact the owner to upgrade your plan</span>
              </div>
            )}
          </div>

          {planCard?.pricePerSeat != null && (
            <div className="rounded-lg border p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>{planCard.seats}</strong>{" "}
                  {planCard.seats === 1 ? "seat" : "seats"} at $
                  {planCard.pricePerSeat} per seat
                </span>
              </div>
              <p className="text-2xl font-bold">
                ${planCard.monthlyTotal}
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Seats follow your team size. Adding or removing a member adjusts
                this on your next invoice.
              </p>
            </div>
          )}

          {planCard?.cancelAtPeriodEnd && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              This subscription is set to cancel at the end of the current
              period.
            </div>
          )}

          {planCard?.pendingInvoice?.hostedInvoiceUrl && (
            <a
              href={planCard.pendingInvoice.hostedInvoiceUrl}
              className="block rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning hover:bg-warning/15"
            >
              An invoice is awaiting payment. Open it to complete payment.
            </a>
          )}

          <div className="flex gap-2">
            {canManageBilling && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={openBillingPortal}
              >
                Manage Billing
              </Button>
            )}

            {(memberData as Member)?.role === ROLES.OWNER &&
              (planCard?.cancelAtPeriodEnd ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={resumeMutation.isPending}
                  onClick={() => resumeMutation.mutate()}
                >
                  Resume Subscription
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  Cancel Subscription
                </Button>
              ))}

            {propContext === "/billing" && (
              <Button variant="ghost" className="flex-1" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Only reachable with manage_billing, which is what both history routes require. */}
      {canManageBilling && <TransactionsCard />}
    </div>
  );
}
