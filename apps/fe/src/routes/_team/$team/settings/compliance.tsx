import { CompliancePage } from "@/components/compliance/compliance-page";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/settings/compliance")({
  beforeLoad: async (context) => {
    return AuthorizedRoute(context, { compliance: ["read"] });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <CompliancePage />;
}
