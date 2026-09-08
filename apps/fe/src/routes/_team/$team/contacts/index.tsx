import CrmListPage from "@/components/crm-list/crm-list-page";
import { validateRecordSearch } from "@/lib/helper/record-search";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/contacts/")({
  validateSearch: validateRecordSearch,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <CrmListPage
      moduleType="CONTACT"
      title="Phonebook"
      description="Manage the people you work with across leads and referrals."
      nameLabel="Contact Name"
      addLabel="Add to Phonebook"
      createPath="/$team/contacts/create"
    />
  );
}
