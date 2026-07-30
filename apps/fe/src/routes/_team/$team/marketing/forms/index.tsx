import { MarketingFormsListPage } from "@/components/marketing/forms/marketing-forms-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/forms/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingFormsListPage />;
}
