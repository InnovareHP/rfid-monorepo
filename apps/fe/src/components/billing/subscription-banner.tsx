import { useSubscriptionState } from "@/hooks/use-subscription-state";
import { formatDate } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { CalendarClock, CreditCard, Hourglass, Lock } from "lucide-react";

// The tone colours the icon and the surface only: destructive and warning are
// both too light in the light theme to carry small text on a tint of themselves.
const banner = cva(
  "flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 text-sm text-foreground",
  {
    variants: {
      tone: {
        warning: "border-warning/30 bg-warning/10 [&>svg]:text-warning",
        destructive:
          "border-destructive/30 bg-destructive/10 [&>svg]:text-destructive",
      },
    },
  }
);

const trialTitle = (daysLeft: number | null) => {
  if (daysLeft === null) return "Your trial is ending";
  if (daysLeft === 0) return "Your trial ends today";
  return `Your trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
};

export function SubscriptionBanner({
  organizationId,
}: {
  organizationId: string;
}) {
  const { notice, trialDaysLeft, endsOn } = useSubscriptionState(organizationId);

  if (!notice) return null;

  const copy = {
    read_only: {
      tone: "destructive" as const,
      icon: Lock,
      title: "Your subscription has ended",
      body: "Your records are still readable and exportable. Renew to make changes again.",
      action: "Renew plan",
    },
    past_due: {
      tone: "destructive" as const,
      icon: CreditCard,
      title: "Your last payment failed",
      body: "We are retrying the card automatically. Update your payment method to keep your team working.",
      action: "Update payment",
    },
    canceling: {
      tone: "warning" as const,
      icon: CalendarClock,
      title: endsOn ? `Your plan ends on ${formatDate(endsOn)}` : "Your plan is ending",
      body: "You keep full access until then, and resuming now changes nothing about your billing date.",
      action: "Resume plan",
    },
    trial_ending: {
      tone: "warning" as const,
      icon: Hourglass,
      title: trialTitle(trialDaysLeft),
      body: "Add a payment method now and your team carries on without interruption.",
      action: "Add payment method",
    },
  }[notice];

  const Icon = copy.icon;

  return (
    <div className={banner({ tone: copy.tone })} role="status">
      <Icon className="h-4 w-4 shrink-0" />

      <p className="font-medium">{copy.title}</p>

      <p className="text-muted-foreground">{copy.body}</p>

      <Button asChild size="sm" variant="outline" className="ml-auto">
        <Link to="/billing">{copy.action}</Link>
      </Button>
    </div>
  );
}
