import MarketLogPage from "@/components/market-log/market-log";
import { ROLES } from "@/lib/constant";
import { AuthorizedRole } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/log/marketing/")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    return AuthorizedRole(context, [ROLES.LIASON, ROLES.ADMISSION_MANAGER]);
  },
});

function RouteComponent() {
  return <MarketLogPage />;
}
