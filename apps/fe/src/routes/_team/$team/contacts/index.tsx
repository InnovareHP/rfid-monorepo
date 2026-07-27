import CrmListPage from "@/components/crm-list/crm-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/contacts/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <CrmListPage
      moduleType="CONTACT"
      title="Contacts"
      description="Manage the people you work with across leads and referrals."
      nameLabel="Contact Name"
      addLabel="Add Contact"
      createPath="/$team/contacts/create"
    />
  );
}
