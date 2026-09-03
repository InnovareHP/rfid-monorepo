import { subscriptionBadgeVariant } from "@/lib/helper/subscription-badge";
import { BillingAwaitingOwner } from "@/components/billing/billing-awaiting-owner";
import { BillingTopBar } from "@/components/billing/billing-top-bar";
import { ContractAwaitingPayment } from "@/components/billing/contract-awaiting-payment";
import { ContractPlanCard } from "@/components/billing/contract-plan-card";
import { TransactionsCard } from "@/components/billing/transactions-card";
import { authClient } from "@/lib/auth-client";
import { can } from "@/lib/permissions";
import { SeatStepper } from "@/components/billing/seat-stepper";
import { getApiErrorMessage } from "@/lib/helper/helper";
import {
  cancelSubscription,
  getContractCard,
  getPlanCard,
  resumeSubscription,
  updateSeats,
} from "@/services/billing/billing-service";
import {
  accessForStatus,
  formatCapitalize,
  ROLES,
  type Subscription,
} from "@dashboard/shared";
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
import { Calendar, Users } from "lucide-react";
import { useCallback, useState } from "react";
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
  const activeOrganizationId = propOrgId ?? context.activeOrganizationId;

  // The standalone /billing route renders outside _team, which is what seeds
  // these caches, so the route context is the only source both paths share.
  const subscriptions =
    (queryClient.getQueryData([
      "subscription",
      activeOrganizationId,
    ]) as Subscription | null) ??
    context.activeSubscription ??
    null;

  const { data: contract } = useQuery({
    queryKey: ["billing-contract", activeOrganizationId],
    queryFn: getContractCard,
    staleTime: 1000 * 60,
  });

  const memberData =
    (queryClient.getQueryData([
      "member-data",
      activeOrganizationId,
    ]) as Member | null) ?? context.memberData;

  // The portal button reached every role while every billing endpoint behind it
  // requires manage_billing.
  const canManageBilling = can((memberData as Member)?.role, {
    billing: ["manage_billing"],
  });

  // Stripe has stopped collecting, so the page explains what happens to the
  // records rather than showing a billing date that has already passed.
  const isReadOnly = accessForStatus(subscriptions?.status) === "read_only";

  const billingInfo = subscriptions && {
    currentPlan: subscriptions?.plan,
    nextBillingDate: subscriptions?.periodEnd,
    status: subscriptions?.status,
  };

  const { data: planCard } = useQuery({
    queryKey: ["billing-plan", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: getPlanCard,
  });

  const [seatOverride, setSeatOverride] = useState<number | null>(null);

  const seatMutation = useMutation({
    mutationFn: updateSeats,
    onSuccess: async () => {
      setSeatOverride(null);
      toast.success("Seats updated");
      await queryClient.invalidateQueries({ queryKey: ["billing-plan"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not update seats")),
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

  const standalone = propContext === "/billing";

  // Seats are purchased, so the stepper starts at what the plan card reports and
  // can never drop below the members already holding one.
  const seats = Math.max(
    seatOverride ?? planCard?.seats ?? 1,
    Math.max(planCard?.memberCount ?? 1, 1)
  );
  const intervalLabel = planCard?.interval === "year" ? "year" : "month";
  const intervalShort = planCard?.interval === "year" ? "yr" : "mo";

  // A contract replaces the plan card outright: its seats and features come from
  // the agreement, and every control below calls a Stripe checkout endpoint that
  // has no subscription to act on. The invoice link is the point of the screen.
  // A member cannot pay, so a page built around a Pay button would be a dead
  // end for them. They get told what is happening instead.
  if (contract && !contract.canManageBilling) {
    return (
      <ContractAwaitingPayment
        contract={contract}
        onRetry={() =>
          queryClient.invalidateQueries({ queryKey: ["billing-contract"] })
        }
        onLogout={handleLogout}
      />
    );
  }

  if (contract) {
    return (
      <div className={cn("w-full", standalone && "min-h-dvh")}>
        {standalone && <BillingTopBar onLogout={handleLogout} />}

        <div className={cn("w-full space-y-8 p-6", className)} {...props}>
          <PageHeader
            title="Billing & Subscription"
            description="Your contract and any invoice waiting to be paid"
          />

          <ContractPlanCard contract={contract} />

          {canManageBilling && <TransactionsCard />}
        </div>
      </div>
    );
  }

  // Every plan button calls a manage_billing endpoint, so a non-owner gets told
  // to wait rather than a picker that would 403 on every click.
  if (!billingInfo) {
    return canManageBilling ? (
      <PlansPage context={propContext} handleLogout={handleLogout} />
    ) : (
      <BillingAwaitingOwner standalone={standalone} onLogout={handleLogout} />
    );
  }

  return (
    <div className={cn("w-full", standalone && "min-h-dvh")}>
      {standalone && <BillingTopBar onLogout={handleLogout} />}

      <div className={cn("w-full space-y-8 p-6", className)} {...props}>
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

                <Badge variant={subscriptionBadgeVariant(billingInfo.status)}>
                  {formatCapitalize(billingInfo.status)}
                </Badge>
              </div>

              {isReadOnly ? (
                <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {billingInfo.nextBillingDate
                      ? `Ended ${new Date(
                          billingInfo.nextBillingDate
                        ).toLocaleDateString()}`
                      : "Subscription ended"}
                  </span>
                </div>
              ) : billingInfo.nextBillingDate &&
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

              {isReadOnly && (
                <p className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  Your records stay readable and exportable, and nothing is
                  deleted on a schedule. The owner can delete them from the
                  Compliance page whenever you are ready.
                </p>
              )}
            </div>

            {planCard?.pricePerSeat != null && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <strong>{planCard.seats}</strong>{" "}
                    {planCard.seats === 1 ? "seat" : "seats"} at $
                    {planCard.pricePerSeat} per seat/{intervalLabel}
                  </span>
                </div>

                <p className="text-2xl font-bold">
                  ${planCard.total}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{intervalShort}
                  </span>
                </p>

                {canManageBilling && (
                  <div className="flex flex-wrap items-center gap-3">
                    <SeatStepper
                      value={seats}
                      min={Math.max(planCard.memberCount, 1)}
                      max={planCard.maxSeats}
                      disabled={seatMutation.isPending}
                      onChange={setSeatOverride}
                    />

                    <Button
                      size="sm"
                      disabled={
                        seats === planCard.seats || seatMutation.isPending
                      }
                      onClick={() => seatMutation.mutate(seats)}
                    >
                      Update seats
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {planCard.memberCount} of {planCard.seats} seats used. Seat
                  changes are prorated onto an invoice straight away.
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
            </div>
          </CardContent>
        </Card>

        {/* Only reachable with manage_billing, which is what both history routes require. */}
        {canManageBilling && <TransactionsCard />}
      </div>
    </div>
  );
}
