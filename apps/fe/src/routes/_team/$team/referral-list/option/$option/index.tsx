import ReferralOption from "@/components/referral-option/referral-option";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/referral-list/option/$option/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <ReferralOption />;
}
