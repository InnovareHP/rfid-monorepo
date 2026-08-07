import { CompliancePage } from "@/components/compliance/compliance-page";
import { AuthorizedRoute, EntitledRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/settings/compliance")({
  beforeLoad: async (context) => {
    // The plan gate runs first: without HIPAA there is no page to authorize.
    EntitledRoute(context, "hipaa");
    return AuthorizedRoute(context, { compliance: ["read"] });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <CompliancePage />;
}
