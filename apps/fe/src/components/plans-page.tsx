import { BillingTopBar } from "@/components/billing/billing-top-bar";
import { SeatStepper } from "@/components/billing/seat-stepper";
import { authClient } from "@/lib/auth-client";
import { getPlanCard, getPlans } from "@/services/billing/billing-service";
import {
  ANNUAL_DISCOUNT,
  isSubscriptionActive,
  PLAN_ENTITLEMENTS,
  PLAN_FEATURE_LABELS,
  resolvePlan,
  type BillingInterval,
  type PlanEntitlement,
  type PlanName,
} from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent, CardHeader } from "@dashboard/ui/components/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRouteContext } from "@tanstack/react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Order is cheapest first, which is also what decides upgrade versus downgrade.
const PLAN_ORDER: PlanName[] = ["essentials", "growth", "scale"];

// Marketing copy only. Prices come from the API catalog and gated features from
// the shared entitlement table, so a card cannot advertise what a guard refuses.
const PLAN_COPY: Record<
  PlanName,
  { name: string; isPopular?: boolean; extras: string[] }
> = {
  essentials: {
    name: "Essentials",
    extras: [
      "Lead & referral management",
      "Expense & mileage tracking",
      "Core analytics dashboard",
      "Email support",
    ],
  },
  growth: {
    name: "Growth",
    isPopular: true,
    extras: [],
  },
  scale: {
    name: "Scale",
    extras: ["Monthly performance reports"],
  },
};

const planFeatures = (plan: PlanName, index: number) => {
  const entitlement = PLAN_ENTITLEMENTS[plan] as PlanEntitlement;
  const previousPlan = index > 0 ? PLAN_ORDER[index - 1] : null;
  const inherited = previousPlan
    ? (PLAN_ENTITLEMENTS[previousPlan] as PlanEntitlement).features
    : [];

  const gained = entitlement.features.filter(
    (feature) => !inherited.includes(feature)
  );

  return [
    ...(previousPlan ? [`Everything in ${PLAN_COPY[previousPlan].name}`] : []),
    ...gained.map((feature) => PLAN_FEATURE_LABELS[feature]),
    ...PLAN_COPY[plan].extras,
  ];
};

export function PlansPage({
  className,
  context: propContext,
  handleLogout,
  ...props
}: {
  context?: "/_team" | "/billing";
  handleLogout?: () => void;
} & React.ComponentProps<"div">) {
  const { activeOrganizationId } = useRouteContext({
    from: propContext ?? "/_team",
  });

  const location = useLocation();

  const [interval, setInterval] = useState<BillingInterval>("month");
  const [seatOverride, setSeatOverride] = useState<number | null>(null);

  const { data: planCard } = useQuery({
    queryKey: ["billing-plan", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: getPlanCard,
  });

  const { data: plans } = useQuery({
    queryKey: ["billing-plans"],
    enabled: !!activeOrganizationId,
    queryFn: getPlans,
  });

  // Existing members already hold a seat, so they are the floor on checkout.
  const minSeats = Math.max(planCard?.memberCount ?? 1, 1);
  const seats = Math.max(seatOverride ?? minSeats, minSeats);
  const yearlyAvailable = !!plans?.every((plan) => plan.yearly !== null);
  const isYearly = interval === "year" && yearlyAvailable;

  const { data: currentPlan = null, isLoading } = useQuery({
    queryKey: ["subscription-status", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: async () => {
      const { data: subscriptions } = await authClient.subscription.list({
        query: {
          referenceId: activeOrganizationId!,
        },
      });

      const activeSubscription = subscriptions?.find((sub: any) =>
        isSubscriptionActive(sub.status)
      );

      return activeSubscription ? resolvePlan(activeSubscription.plan) : null;
    },
  });

  const SubscribePlan = async (plan: string) => {
    try {
      if (!activeOrganizationId) return;

      const { error } = await authClient.subscription.upgrade({
        plan,
        annual: isYearly,
        seats,
        referenceId: activeOrganizationId,
        customerType: "organization",
        successUrl: `${
          import.meta.env.VITE_APP_URL
        }/${activeOrganizationId}/success`,
        cancelUrl: `${import.meta.env.VITE_APP_URL}${location.href}`,
      });

      if (error) toast.error(error.message);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className={cn("w-full min-h-screen", className)} {...props}>
      {propContext === "/billing" && <BillingTopBar onLogout={handleLogout} />}

      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        <div className="mb-12 space-y-2 text-center">
          <h1 className="page-title text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your plan
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base">
            Every plan carries lead and referral management. Pick how many
            members you need and the extras your team wants.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {yearlyAvailable && (
            <Tabs
              value={interval}
              onValueChange={(value) => setInterval(value as BillingInterval)}
            >
              <TabsList>
                <TabsTrigger value="month">Monthly</TabsTrigger>
                <TabsTrigger value="year">
                  Yearly
                  <Badge variant="secondary">
                    Save {ANNUAL_DISCOUNT * 100}%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium">Members</span>
            <SeatStepper
              value={seats}
              min={minSeats}
              max={planCard?.maxSeats ?? seats}
              onChange={setSeatOverride}
            />
            <p className="text-xs text-muted-foreground">
              {minSeats === 1
                ? "Add seats now or any time from the billing page."
                : `${minSeats} members already in this organization.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLAN_ORDER.map((planId, index) => {
            const copy = PLAN_COPY[planId];
            const catalog = plans?.find((plan) => plan.name === planId);
            const pricePerSeat = isYearly
              ? (catalog?.yearly ?? null)
              : (catalog?.monthly ?? null);
            const features = planFeatures(planId, index);
            const isCurrent = currentPlan === planId;
            const isUpgrade =
              !currentPlan || index > PLAN_ORDER.indexOf(currentPlan);

            return (
              <Card
                key={planId}
                className={cn(
                  copy.isPopular &&
                    "border-primary ring-primary/20 shadow-lg ring-1"
                )}
              >
                <CardHeader className="pb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-2xl font-bold">
                        {copy.name}
                      </h3>

                      {copy.isPopular && (
                        <Badge>
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-4xl font-bold text-brand">
                        ${pricePerSeat ?? "—"}
                      </span>
                      <span className="text-muted-foreground">
                        per seat/{isYearly ? "year" : "month"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {seats} {seats === 1 ? "member" : "members"} ={" "}
                      <strong>
                        ${pricePerSeat != null ? pricePerSeat * seats : "—"}
                      </strong>
                      /{isYearly ? "year" : "month"}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col space-y-6">
                  <ul className="space-y-3 flex-1">
                    <li className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {seats} {seats === 1 ? "member" : "members"}, add more
                        any time
                      </span>
                    </li>
                    {features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                      >
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isLoading ? (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      disabled
                    >
                      Checking subscription...
                    </Button>
                  ) : isCurrent ? (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      disabled
                    >
                      Your current plan
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full"
                      disabled={pricePerSeat == null}
                      onClick={() => SubscribePlan(planId)}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"} to {copy.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
