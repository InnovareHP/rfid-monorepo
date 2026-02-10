import ReferralListImportPage from "@/components/import/referral-list-import-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/import/referral-list/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ReferralListImportPage />;
}
