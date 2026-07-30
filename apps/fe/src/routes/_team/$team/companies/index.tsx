import CrmListPage from "@/components/crm-list/crm-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/companies/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <CrmListPage
      moduleType="COMPANY"
      title="Companies"
      description="Track the organizations behind your contacts and referrals."
      nameLabel="Company Name"
      addLabel="Add Company"
      createPath="/$team/companies/create"
    />
  );
}
