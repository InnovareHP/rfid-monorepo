import MarketLogPage from "@/components/market-log/market-log";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/log/marketing/")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    return AuthorizedRoute(context, { log: ["create"] });
  },
});

function RouteComponent() {
  return <MarketLogPage />;
}
