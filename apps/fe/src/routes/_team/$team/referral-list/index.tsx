import ReferralListPage from "@/components/referral-list/referral-list-page";
import { validateRecordSearch } from "@/lib/helper/record-search";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/referral-list/")({
  validateSearch: validateRecordSearch,
  component: RouteComponent,
});

function RouteComponent() {
  return <ReferralListPage />;
}
