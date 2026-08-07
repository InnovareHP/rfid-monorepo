import MileageLogPage from "@/components/mileage-log/mileage-log-page";
import { AuthorizedRoute } from "@/lib/helper/helper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/log/mileage/")({
  component: RouteComponent,
  beforeLoad: async (context) => {
    return AuthorizedRoute(context, { log: ["create"] });
  },
});

function RouteComponent() {
  return <MileageLogPage />;
}
