import { BillingPage } from "@/components/billing-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/settings/billing")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BillingPage />;
}
