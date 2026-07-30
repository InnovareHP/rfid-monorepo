import { MarketingFormBuilderPage } from "@/components/marketing/forms/marketing-form-builder-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/forms/$formId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingFormBuilderPage />;
}
