import { BillingTopBar } from "@/components/billing/billing-top-bar";
import { authClient } from "@/lib/auth-client";
import { getPlanCard } from "@/services/billing/billing-service";
import {
  isSubscriptionActive,
  PLAN_ENTITLEMENTS,
  PLAN_FEATURE_LABELS,
  resolvePlan,
  type PlanEntitlement,
  type PlanName,
} from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent, CardHeader } from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRouteContext } from "@tanstack/react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Order is cheapest first, which is also what decides upgrade versus downgrade.
const PLAN_ORDER: PlanName[] = ["essentials", "growth", "scale"];

// Price and marketing copy only. Seats and gated features are read from the
// shared entitlement table so a card can never advertise what a guard refuses.
const PLAN_COPY: Record<
  PlanName,
  { name: string; price: number; isPopular?: boolean; extras: string[] }
> = {
  essentials: {
    name: "Essentials",
    price: 20,
    extras: [
      "Lead & referral management",
      "Expense & mileage tracking",
      "Core analytics dashboard",
      "Email support",
    ],
  },
  growth: {
    name: "Growth",
    price: 49,
    isPopular: true,
    extras: ["Advanced analytics & reporting"],
  },
  scale: {
    name: "Scale",
    price: 79,
    extras: ["Custom reporting & dashboards", "Monthly performance reports"],
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
    `Up to ${entitlement.seats} team members`,
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

  const { data: planCard } = useQuery({
    queryKey: ["billing-plan", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: getPlanCard,
  });

  const seatCount = planCard?.seats ?? 1;

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
            Every plan carries lead and referral management. Pick the seat count
            and the extras your team needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLAN_ORDER.map((planId, index) => {
            const plan = PLAN_COPY[planId];
            const features = planFeatures(planId, index);
            const isCurrent = currentPlan === planId;
            const isUpgrade =
              !currentPlan || index > PLAN_ORDER.indexOf(currentPlan);

            return (
              <Card
                key={planId}
                className={cn(
                  plan.isPopular && "border-primary ring-primary/20 shadow-lg ring-1"
                )}
              >
                <CardHeader className="pb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-2xl font-bold">{plan.name}</h3>

                      {plan.isPopular && (
                        <Badge>
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-4xl font-bold text-brand">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground">
                        per seat/month
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {seatCount} {seatCount === 1 ? "seat" : "seats"} today ={" "}
                      <strong>${plan.price * seatCount}</strong>/month
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col space-y-6">
                  <ul className="space-y-3 flex-1">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
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
                      onClick={() => SubscribePlan(planId)}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"} to {plan.name}
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
