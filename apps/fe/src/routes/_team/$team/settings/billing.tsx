import { BillingPage } from "@/components/billing-page";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

// Every billing endpoint requires manage_billing, so a non-owner landing here
// gets a page of 403s. The standalone /billing route stays open on purpose: it is
// where _team.tsx sends a lapsed subscription, whatever the role.
export const Route = createFileRoute("/_team/$team/settings/billing")({
  beforeLoad: async (context) =>
    AuthorizedRoute(context, { billing: ["manage_billing"] }),
  component: RouteComponent,
});

function RouteComponent() {
  return <BillingPage />;
}
